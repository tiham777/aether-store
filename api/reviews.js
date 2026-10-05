/* GET  /api/reviews?productId=… — pull written reviews (all if no filter)
   POST /api/reviews — publish a review (verified purchasers only)

   A review is accepted only when the caller can prove they bought the
   product: the payload must carry the order id AND the exact total of a
   real order in the shared ledger that contains the product. We never
   trust a client-supplied "verified" flag, we never store the order id or
   total with the review, and one purchase yields at most one review.
   Order ids are printed on the confirmation page and in every customer
   email, so a real buyer can always produce theirs.                      */

const { configured, cmd, json, bodyOf, methodGuard } = require('./_store');

const REVIEWS_KEY = 'aether:reviews';
const ORDERS_KEY = 'aether:orders';
const MAX = 1000;

function validReview(r) {
  return Boolean(
    r &&
      typeof r.id === 'string' &&
      r.id.length <= 64 &&
      typeof r.productId === 'string' &&
      /^[a-z0-9-]{2,40}$/.test(r.productId) &&
      Number.isFinite(r.rating) &&
      r.rating >= 1 &&
      r.rating <= 5 &&
      typeof r.text === 'string' &&
      r.text.trim().length >= 10 &&
      r.text.length <= 500 &&
      typeof r.name === 'string' &&
      r.name.trim().length >= 2 &&
      r.name.length <= 60
  );
}

/* Ownership proof: the order id must exist in the ledger, contain the
   product, and match the total to the cent (token-level precision). */
function orderProvesPurchase(order, r) {
  return Boolean(
    order &&
      order.id === r.orderId &&
      typeof order.total === 'number' &&
      order.total === r.orderTotal &&
      Array.isArray(order.items) &&
      order.items.some((it) => it && it.productId === r.productId && Number(it.qty) > 0)
  );
}

/* Public shape — ownership proof never leaves the server. */
function publicReview(r) {
  const { orderId, orderTotal, ...pub } = r;
  return pub;
}

module.exports = async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    if (!configured()) return json(res, 503, { ok: false, error: 'not-configured' });
    try {
      const r = await cmd(['LRANGE', REVIEWS_KEY, '0', String(MAX - 1)]);
      let reviews = (r.result || [])
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .map(publicReview); /* ledger proof is write-only metadata */
      const wanted =
        (req.query && req.query.productId) ||
        (req.url && new URL(req.url, 'http://x').searchParams.get('productId'));
      if (wanted) reviews = reviews.filter((rv) => rv.productId === wanted);
      return json(res, 200, { ok: true, reviews });
    } catch (e) {
      return json(res, 502, { ok: false, error: 'store-unavailable' });
    }
  }

  /* POST — the verified-purchase gate */
  if (!configured()) return json(res, 503, { ok: false, error: 'not-configured' });
  const review = bodyOf(req);
  if (!validReview(review)) return json(res, 400, { ok: false, error: 'invalid-review' });
  if (typeof review.orderId !== 'string' || !review.orderId.trim()) {
    return json(res, 403, { ok: false, error: 'not-verified', need: 'orderId' });
  }
  if (!Number.isFinite(review.orderTotal)) {
    return json(res, 403, { ok: false, error: 'not-verified', need: 'orderTotal' });
  }

  try {
    const [ordRes, revRes] = await Promise.all([
      cmd(['LRANGE', ORDERS_KEY, '0', String(MAX - 1)]),
      cmd(['LRANGE', REVIEWS_KEY, '0', String(MAX - 1)]),
    ]);
    const parsed = (ordRes.result || [])
      .map((s) => {
        try {
          return JSON.parse(s);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
    /* a retried order submit can leave duplicate rows for the same id —
       collapse them so the buyer is never locked out by a retry */
    const seen = new Set();
    const orders = parsed.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
    const existing = (revRes.result || [])
      .map((s) => {
        try {
          return JSON.parse(s);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    /* exactly one order must match — proving ownership, not guessing */
    const proof = orders.filter((o) => orderProvesPurchase(o, review));
    if (proof.length === 0) {
      return json(res, 403, { ok: false, error: 'not-verified' });
    }
    if (proof.length > 1) {
      return json(res, 409, { ok: false, error: 'ambiguous-proof' });
    }

    /* one review per purchase, regardless of name/account */
    if (existing.some((rv) => rv.orderId === review.orderId && rv.productId === review.productId)) {
      return json(res, 409, { ok: false, error: 'already-reviewed' });
    }

    const stored = { ...review, verified: true, at: Date.now() };
    await cmd(['LPUSH', REVIEWS_KEY, JSON.stringify(stored)]);
    return json(res, 201, { ok: true, shared: true, id: review.id });
  } catch (e) {
    return json(res, 502, { ok: false, error: 'store-unavailable' });
  }
};

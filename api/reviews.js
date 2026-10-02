/* GET  /api/reviews?productId=… — pull written reviews (all if no filter)
   POST /api/reviews — publish a review                                */

const { configured, cmd, json, bodyOf, methodGuard } = require('./_store');

const KEY = 'aether:reviews';
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

module.exports = async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    if (!configured()) return json(res, 503, { ok: false, error: 'not-configured' });
    try {
      const r = await cmd(['LRANGE', KEY, '0', String(MAX - 1)]);
      let reviews = (r.result || [])
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
      const wanted =
        (req.query && req.query.productId) ||
        (req.url && new URL(req.url, 'http://x').searchParams.get('productId'));
      if (wanted) reviews = reviews.filter((rv) => rv.productId === wanted);
      return json(res, 200, { ok: true, reviews });
    } catch (e) {
      return json(res, 502, { ok: false, error: 'store-unavailable' });
    }
  }

  /* POST */
  if (!configured()) return json(res, 503, { ok: false, error: 'not-configured' });
  const review = bodyOf(req);
  if (!validReview(review)) return json(res, 400, { ok: false, error: 'invalid-review' });
  try {
    await cmd(['LPUSH', KEY, JSON.stringify(review)]);
    return json(res, 201, { ok: true, shared: true, id: review.id });
  } catch (e) {
    return json(res, 502, { ok: false, error: 'store-unavailable' });
  }
};

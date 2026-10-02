/* GET  /api/orders — list shared orders (admin pull)
   POST /api/orders — place an order into the shared store          */

const { configured, cmd, json, adminAllowed, bodyOf, methodGuard } = require('./_store');

const KEY = 'aether:orders';
const MAX = 1000;

function validOrder(o) {
  return Boolean(
    o &&
      typeof o.id === 'string' &&
      /^AET-\d{4}-[A-Z0-9-]{4,}$/.test(o.id) &&
      typeof o.email === 'string' &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email) &&
      Array.isArray(o.items) &&
      o.items.length > 0 &&
      o.items.every((i) => i && typeof i.productId === 'string' && typeof i.qty === 'number') &&
      typeof o.total === 'number' &&
      o.total >= 0
  );
}

module.exports = async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST'])) return;

  if (req.method === 'GET') {
    if (!configured()) return json(res, 503, { ok: false, error: 'not-configured' });
    if (!adminAllowed(req)) return json(res, 401, { ok: false, error: 'unauthorized' });
    try {
      const r = await cmd(['LRANGE', KEY, '0', String(MAX - 1)]);
      const orders = (r.result || [])
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
      return json(res, 200, { ok: true, orders });
    } catch (e) {
      return json(res, 502, { ok: false, error: 'store-unavailable' });
    }
  }

  /* POST */
  if (!configured()) return json(res, 503, { ok: false, error: 'not-configured' });
  const order = bodyOf(req);
  if (!validOrder(order)) return json(res, 400, { ok: false, error: 'invalid-order' });
  try {
    await cmd(['LPUSH', KEY, JSON.stringify(order)]);
    await cmd(['LTRIM', KEY, '0', String(MAX - 1)]);
    return json(res, 201, { ok: true, shared: true, id: order.id });
  } catch (e) {
    return json(res, 502, { ok: false, error: 'store-unavailable' });
  }
};

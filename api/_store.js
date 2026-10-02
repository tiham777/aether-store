/* Shared helpers for AETHER Vercel functions — Upstash Redis over REST.
   No dependencies: plain fetch, so the functions bundle as-is. */

const KEY_ENV = 'AETHER_ADMIN_KEY';

function env(name) {
  return process.env[name] || '';
}

function configured() {
  return Boolean(env('UPSTASH_REDIS_REST_URL') && env('UPSTASH_REDIS_REST_TOKEN'));
}

/* One-shot command against the Upstash REST endpoint. */
async function cmd(args) {
  const res = await fetch(env('UPSTASH_REDIS_REST_URL'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('UPSTASH_REDIS_REST_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`upstash_${res.status}`);
  const data = await res.json();
  return data && Object.prototype.hasOwnProperty.call(data, 'result') ? data : { result: null };
}

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
  return body;
}

/* Reads are open unless AETHER_ADMIN_KEY is set — demo-grade by design,
   documented in README. */
function adminAllowed(req) {
  const required = env(KEY_ENV);
  if (!required) return true;
  const got = req.headers && (req.headers['x-aether-key'] || req.headers['X-Aether-Key']);
  return got === required;
}

function bodyOf(req) {
  const b = req.body;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch (e) {
      return null;
    }
  }
  return b || null;
}

function methodGuard(req, res, allowed) {
  if (allowed.includes(req.method)) return false;
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { ok: false, error: 'method-not-allowed' });
  return true;
}

module.exports = { env, configured, cmd, json, adminAllowed, bodyOf, methodGuard };

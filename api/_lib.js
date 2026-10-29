const crypto = require('crypto');
const { Redis } = require('@upstash/redis');
const seed = require('./seed.json');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const cfgErr = m => Object.assign(new Error(m), { cfg: true });
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) throw cfgErr('Chưa cấu hình SESSION_SECRET (tối thiểu 24 ký tự)');
  return s;
};
const sign = v => crypto.createHmac('sha256', secret()).update(v).digest('base64url');
const eq = (a, b) => {
  a = Buffer.from(String(a)); b = Buffer.from(String(b));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const admins = () => (process.env.ADMIN_USERNAMES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const hashPw = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? no(e) : ok(k.toString('hex')))));
const ip = req => String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();

const COOKIE = 'HttpOnly; Secure; SameSite=Lax; Path=/';
function setSession(res, name) {
  const days = 30;
  const p = Buffer.from(JSON.stringify({ u: name.toLowerCase(), e: Date.now() + days * 864e5 })).toString('base64url');
  res.setHeader('Set-Cookie', `sid=${p}.${sign(p)}; ${COOKIE}; Max-Age=${days * 86400}`);
}
const clearSession = res => res.setHeader('Set-Cookie', `sid=; ${COOKIE}; Max-Age=0`);
function sessionUser(req) {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)sid=([^;]+)/);
  if (!m) return null;
  const [p, sig] = m[1].split('.');
  if (!p || !sig || !eq(sig, sign(p))) return null;
  try {
    const d = JSON.parse(Buffer.from(p, 'base64url').toString());
    return d.e > Date.now() ? d.u : null;
  } catch { return null; }
}
async function getMe(req) {
  const u = sessionUser(req);
  if (!u) return null;
  const rec = await redis.get('user:' + u);
  if (!rec) return null;
  const t = await redis.get('team_of:' + u);
  return { name: rec.name, key: u, role: admins().includes(u) ? 'admin' : 'captain', team: t === null || t === undefined ? null : Number(t) };
}
const pub = me => (me ? { name: me.name, role: me.role, team: me.team } : null);

function guard(req, res, methods) {
  res.setHeader('Cache-Control', 'no-store');
  if (!methods.includes(req.method)) { res.status(405).json({ error: 'Phương thức không hợp lệ' }); return false; }
  if (req.method !== 'GET') {
    let same = true;
    const o = req.headers.origin;
    if (o) { try { same = new URL(o).host === req.headers.host; } catch { same = false; } }
    if (!same || !/application\/json/.test(req.headers['content-type'] || '')) {
      res.status(403).json({ error: 'Yêu cầu không hợp lệ' }); return false;
    }
  }
  return true;
}
const wrap = fn => async (req, res) => {
  try {
    if (!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) || !(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN))
      throw cfgErr('Chưa kết nối Upstash Redis cho dự án (thiếu biến môi trường URL/TOKEN)');
    await fn(req, res);
  } catch (e) { console.error(e); res.status(500).json({ error: e.cfg ? e.message : 'Lỗi máy chủ, hãy thử lại sau' }); }
};
async function limit(key, max, sec) {
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, sec);
  return n <= max;
}
async function league() {
  let s = await redis.get('league');
  if (!s) { await redis.set('league', seed, { nx: true }); s = (await redis.get('league')) || seed; }
  return s;
}
const owners = () => redis.mget(...[0, 1, 2, 3, 4, 5].map(i => 'owner:' + i));
const cleanPl = a => (Array.isArray(a) ? a : []).slice(0, 60).map(p => ({
  id: String((p && p.id) || '').slice(0, 24) || crypto.randomBytes(4).toString('hex'),
  name: String((p && p.name) || '').trim().slice(0, 40),
  no: String((p && p.no) || '').trim().slice(0, 4),
})).filter(p => p.name);

module.exports = { crypto, redis, eq, admins, hashPw, ip, setSession, clearSession, getMe, pub, guard, wrap, limit, league, owners, cleanPl };

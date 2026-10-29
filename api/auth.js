const { crypto, redis, eq, admins, hashPw, ip, setSession, clearSession, guard, wrap, limit } = require('./_lib');
const NAME = /^[A-Za-z0-9_.-]{3,24}$/;

module.exports = wrap(async (req, res) => {
  if (!guard(req, res, ['POST'])) return;
  const a = req.query.a, b = req.body || {};
  if (a === 'logout') { clearSession(res); return res.json({ ok: true }); }

  const name = String(b.username || '').trim(), pw = String(b.password || ''), lc = name.toLowerCase();
  if (!NAME.test(name)) return res.status(400).json({ error: 'Tên đăng nhập 3–24 ký tự: chữ không dấu, số, dấu _ . -' });

  if (a === 'register') {
    if (pw.length < 8 || pw.length > 128) return res.status(400).json({ error: 'Mật khẩu cần từ 8 đến 128 ký tự' });
    if (!(await limit('rl:reg:' + ip(req), 10, 3600))) return res.status(429).json({ error: 'Bạn thử quá nhiều lần, hãy quay lại sau' });
    if (admins().includes(lc) && !(process.env.ADMIN_CODE && eq(b.adminCode || '', process.env.ADMIN_CODE)))
      return res.status(403).json({ error: 'Tên này dành cho ban tổ chức, cần nhập đúng mã quản trị' });
    const salt = crypto.randomBytes(16).toString('hex');
    const ok = await redis.set('user:' + lc, { name, salt, hash: await hashPw(pw, salt), created: Date.now() }, { nx: true });
    if (!ok) return res.status(409).json({ error: 'Tên đăng nhập này đã có người dùng' });
    setSession(res, name);
    return res.json({ ok: true });
  }

  if (a === 'login') {
    if (!(await limit('rl:login:' + ip(req) + ':' + lc, 8, 900))) return res.status(429).json({ error: 'Đăng nhập sai quá nhiều lần, hãy thử lại sau 15 phút' });
    const rec = await redis.get('user:' + lc);
    const h = await hashPw(pw, rec ? rec.salt : '0'.repeat(32));
    if (!rec || !eq(h, rec.hash)) return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    setSession(res, rec.name);
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
});

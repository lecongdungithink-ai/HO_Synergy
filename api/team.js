const { redis, guard, wrap, getMe, league, cleanPl } = require('./_lib');

module.exports = wrap(async (req, res) => {
  if (!guard(req, res, ['POST', 'PUT'])) return;
  const me = await getMe(req);
  if (!me) return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  const b = req.body || {};

  // Đội trưởng cập nhật danh sách cầu thủ đội mình
  if (req.method === 'PUT') {
    if (me.team === null) return res.status(403).json({ error: 'Bạn chưa có đội' });
    const cur = await league();
    cur.teams[me.team].pl = cleanPl(b.players);
    await redis.set('league', cur);
    return res.json({ ok: true });
  }

  const i = Number(b.team);
  if (!Number.isInteger(i) || i < 0 || i > 5) return res.status(400).json({ error: 'Đội không hợp lệ' });

  if (b.release) {
    const owner = await redis.get('owner:' + i);
    if (!owner) return res.json({ ok: true });
    if (me.role !== 'admin' && me.team !== i) return res.status(403).json({ error: 'Bạn không có quyền' });
    await redis.del('owner:' + i, 'team_of:' + String(owner).toLowerCase());
    return res.json({ ok: true });
  }

  if (me.role === 'admin') return res.status(400).json({ error: 'Tài khoản ban tổ chức không nhận đội' });
  if (me.team !== null) return res.status(409).json({ error: 'Bạn đã có đội rồi' });
  if (!(await redis.set('team_of:' + me.key, i, { nx: true }))) return res.status(409).json({ error: 'Bạn đã có đội rồi' });
  if (!(await redis.set('owner:' + i, me.name, { nx: true }))) {
    await redis.del('team_of:' + me.key);
    return res.status(409).json({ error: 'Đội này đã có đội trưởng' });
  }
  res.json({ ok: true });
});

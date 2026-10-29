const { redis, guard, wrap, getMe, pub, league, owners, cleanPl } = require('./_lib');

module.exports = wrap(async (req, res) => {
  if (!guard(req, res, ['GET', 'PUT'])) return;
  const cur = await league(), me = await getMe(req), own = await owners();

  if (req.method === 'GET') {
    return res.json({
      state: cur,
      owners: Object.fromEntries(own.map((v, i) => [i, v]).filter(x => x[1])),
      me: pub(me),
    });
  }

  if (!me || me.role !== 'admin') return res.status(403).json({ error: 'Chỉ ban tổ chức được sửa dữ liệu giải' });
  const inc = (req.body || {}).state;
  if (!inc || !Array.isArray(inc.teams) || inc.teams.length !== 6 || !Array.isArray(inc.matches) || inc.matches.length !== cur.matches.length)
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });

  const sc = v => (v === null || v === undefined || v === '' ? null : Math.min(99, Math.max(0, parseInt(v, 10) || 0)));
  const teams = cur.teams.map((t, i) => ({
    name: String((inc.teams[i] || {}).name || '').trim().slice(0, 40) || t.name,
    pl: own[i] ? t.pl : cleanPl((inc.teams[i] || {}).pl), // đội đã có đội trưởng: danh sách do đội trưởng quản lý
  }));
  const matches = cur.matches.map((m, i) => {
    const x = inc.matches[i] || {};
    const ev = (Array.isArray(x.ev) ? x.ev : []).slice(0, 80)
      .filter(e => e && ['g', 'y', 'r'].includes(e.t))
      .map(e => ({ t: e.t, p: String(e.p).slice(0, 24), min: String(e.min || '').slice(0, 3) }));
    return { r: m.r, h: m.h, a: m.a, hs: sc(x.hs), as: sc(x.as), ev };
  });
  await redis.set('league', { ...cur, teams, matches });
  res.json({ ok: true });
});

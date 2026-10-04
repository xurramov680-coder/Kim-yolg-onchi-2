const express = require('express'), http = require('http'), crypto = require('crypto');
const { Server } = require('socket.io');
const CASES = require('./cases');

const app = express();
app.use(express.static('public'));
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();
const SECS = { discuss: 180, vote: 45, tie: 45 }, GRACE = 60000;

const rnd = n => crypto.randomInt(n);
const clean = (s, n) => String(s || '').replace(/[<>]/g, '').trim().slice(0, n);
const newCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r;
  do { r = Array.from({ length: 6 }, () => c[rnd(c.length)]).join(''); } while (rooms.has(r));
  return r;
};
const mkPlayer = name => ({ id: crypto.randomBytes(16).toString('hex'), name, sid: null, on: true, role: null, clue: null, vote: null, score: 0, last: 0, dc: null });
const sys = (r, t) => { r.chat.push({ sys: 1, t }); r.chat = r.chat.slice(-100); };

// Each player only ever receives their own role, clue and vote.
function view(r, p) {
  const playing = r.phase !== 'lobby';
  return {
    code: r.code, phase: r.phase, host: p.id === r.host, me: r.ps.indexOf(p), round: r.round,
    endsAt: r.endsAt, now: Date.now(), cand: r.cand,
    players: r.ps.map(q => ({ name: q.name, on: q.on, voted: q.vote != null, score: q.score, host: q.id === r.host })),
    chat: r.chat, case: playing ? { t: r.c.t, s: r.c.s } : null,
    role: playing ? p.role : null, clue: playing ? p.clue : null, myVote: p.vote,
    result: r.phase === 'reveal' ? r.result : null
  };
}
function push(r) { r.ps.forEach(p => p.sid && io.to(p.sid).emit('state', view(r, p))); }

function setPhase(r, phase) {
  clearTimeout(r.timer);
  r.phase = phase;
  r.endsAt = SECS[phase] ? Date.now() + SECS[phase] * 1000 : 0;
  if (SECS[phase]) r.timer = setTimeout(() => onTimer(r), SECS[phase] * 1000);
}
function onTimer(r) {
  if (r.phase === 'discuss') { r.cand = null; setPhase(r, 'vote'); }
  else if (r.phase === 'tie') { setPhase(r, 'vote'); }
  else if (r.phase === 'vote') return tally(r);
  push(r);
}

function startRound(r) {
  r.round++; r.c = CASES[rnd(CASES.length)]; r.chat = []; r.cand = null; r.second = false; r.result = null;
  r.liar = rnd(5);
  const clues = [...r.c.h].sort(() => rnd(3) - 1);
  r.ps.forEach((p, i) => {
    p.vote = null;
    p.role = i === r.liar ? 'liar' : 'honest';
    p.clue = i === r.liar ? r.c.l : clues.pop();
  });
  sys(r, 'Case: ' + r.c.s);
  setPhase(r, 'discuss');
}

function tally(r) {
  const n = r.ps.map(() => 0);
  r.ps.forEach(p => { if (p.vote != null) n[p.vote]++; });
  const max = Math.max(...n), tops = n.map((v, i) => v === max ? i : -1).filter(i => i >= 0);
  if (max > 0 && tops.length > 1 && !r.second) {
    r.second = true; r.cand = tops; r.ps.forEach(p => p.vote = null);
    sys(r, 'Tie between ' + tops.map(i => r.ps[i].name).join(' and ') + '. Discuss again, then vote.');
    setPhase(r, 'tie'); return push(r);
  }
  const caught = max > 0 && tops.length === 1 && tops[0] === r.liar;
  const delta = r.ps.map((p, i) => {
    let d = 0;
    if (i === r.liar) { if (!caught) d += 100 + 150; }
    else { if (caught) d += 100; if (p.vote === r.liar) d += 100; }
    return d;
  });
  r.ps.forEach((p, i) => p.score += delta[i]);
  r.result = { liar: r.liar, caught, votes: r.ps.map(p => p.vote), delta, clues: r.ps.map(p => p.clue) };
  setPhase(r, 'reveal'); r.cand = null;
  push(r);
}

function dropPlayer(r, p) {
  r.ps = r.ps.filter(q => q !== p);
  if (!r.ps.length) { clearTimeout(r.timer); return rooms.delete(r.code); }
  if (r.host === p.id) r.host = r.ps[0].id;
}
function abort(r, p) {
  if (!rooms.has(r.code) || p.on) return;
  const wasLobby = r.phase === 'lobby', inGame = r.phase !== 'lobby' && r.phase !== 'reveal';
  dropPlayer(r, p);
  if (!rooms.has(r.code)) return;
  if (inGame) {
    clearTimeout(r.timer); r.phase = 'lobby'; r.endsAt = 0; r.cand = null; r.result = null;
    r.ps.forEach(q => { q.vote = null; q.role = null; q.clue = null; });
    io.to(r.code).emit('err', p.name + " didn't reconnect. Round cancelled.");
  } else if (!wasLobby) r.phase = 'lobby';
  push(r);
}

io.on('connection', s => {
  let ctx = null;
  const err = m => s.emit('err', m);
  const attach = (r, p) => { clearTimeout(p.dc); p.sid = s.id; p.on = true; ctx = { r, p }; s.join(r.code); };

  s.on('create', (d, cb) => {
    if (typeof cb !== 'function') return;
    const name = clean(d && d.name, 16);
    if (!name) return cb({ error: 'Enter a nickname.' });
    const p = mkPlayer(name);
    const r = { code: newCode(), host: p.id, ps: [p], phase: 'lobby', round: 0, chat: [], timer: null, endsAt: 0, c: null, cand: null, second: false, result: null, liar: -1 };
    rooms.set(r.code, r); attach(r, p);
    cb({ ok: 1, code: r.code, token: p.id }); push(r);
  });

  s.on('join', (d, cb) => {
    if (typeof cb !== 'function') return;
    const r = rooms.get(clean(d && d.code, 6).toUpperCase()), name = clean(d && d.name, 16);
    if (!r) return cb({ error: 'Room not found.' });
    if (!name) return cb({ error: 'Enter a nickname.' });
    if (r.phase !== 'lobby') return cb({ error: 'Game has already started.' });
    if (r.ps.length >= 5) return cb({ error: 'Room is full.' });
    if (r.ps.some(q => q.name.toLowerCase() === name.toLowerCase())) return cb({ error: 'You are already in this room.' });
    const p = mkPlayer(name); r.ps.push(p); attach(r, p);
    cb({ ok: 1, code: r.code, token: p.id }); push(r);
  });

  s.on('rejoin', (d, cb) => {
    if (typeof cb !== 'function') return;
    const r = rooms.get(clean(d && d.code, 6).toUpperCase());
    const p = r && r.ps.find(q => q.id === (d && d.token));
    if (!p) return cb({ error: 'Room not found.' });
    attach(r, p); sys(r, p.name + ' reconnected.');
    cb({ ok: 1 }); push(r);
  });

  s.on('start', () => {
    if (!ctx) return;
    const { r, p } = ctx;
    if (p.id !== r.host) return err('Only the host can start.');
    if (r.phase !== 'lobby' && r.phase !== 'reveal') return err('Game has already started.');
    if (r.ps.length < 5 || r.ps.some(q => !q.on)) return err('Waiting for 5 players...');
    startRound(r); push(r);
  });

  s.on('chat', d => {
    if (!ctx) return;
    const { r, p } = ctx, t = clean(d && d.text, 200), now = Date.now();
    if (!t || now - p.last < 400 || !['discuss', 'tie', 'reveal'].includes(r.phase)) return;
    p.last = now; r.chat.push({ n: p.name, t }); r.chat = r.chat.slice(-100); push(r);
  });

  s.on('vote', d => {
    if (!ctx) return;
    const { r, p } = ctx, t = d && d.target;
    if (r.phase !== 'vote' || p.vote != null) return;
    if (!Number.isInteger(t) || t < 0 || t >= r.ps.length || r.ps[t] === p) return;
    if (r.cand && !r.cand.includes(t)) return;
    p.vote = t;
    if (r.ps.every(q => q.vote != null || !q.on)) return tally(r);
    push(r);
  });

  s.on('disconnect', () => {
    if (!ctx || ctx.p.sid !== s.id) return;
    const { r, p } = ctx; p.on = false;
    if (r.phase === 'lobby') { p.dc = setTimeout(() => abort(r, p), 10000); }
    else { sys(r, p.name + ' disconnected.'); p.dc = setTimeout(() => abort(r, p), GRACE); }
    push(r);
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Who Is Lying? running on port ' + (process.env.PORT || 3000)));

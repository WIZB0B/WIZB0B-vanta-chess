import { Chess } from 'chess.js';

// Opening trainer: finds where your own games left known opening theory on YOUR move, and
// turns each of those moments into a drill (play the book moves from there).
// The repertoire below is standard main-line theory, written out for VCH.
export const REPERTOIRE = [
  { name: 'Ruy Lopez · Closed', line: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3' },
  { name: 'Ruy Lopez · Berlin', line: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8' },
  { name: 'Ruy Lopez · Exchange', line: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4' },
  { name: 'Italian · Giuoco Pianissimo', line: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O' },
  { name: 'Italian · Two Knights', line: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6' },
  { name: 'Scotch Game', line: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4' },
  { name: 'Petrov Defense', line: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3' },
  { name: 'Philidor Defense', line: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O' },
  { name: 'Vienna Gambit', line: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3' },
  { name: "King's Gambit Accepted", line: 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5' },
  { name: 'Sicilian · Najdorf', line: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6' },
  { name: 'Sicilian · Dragon', line: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6' },
  { name: 'Sicilian · Sveshnikov', line: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5' },
  { name: 'Sicilian · Taimanov', line: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be2 a6 O-O Nf6' },
  { name: 'Sicilian · Alapin', line: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4' },
  { name: 'French · Winawer', line: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4' },
  { name: 'French · Advance', line: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3' },
  { name: 'French · Tarrasch', line: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2' },
  { name: 'Caro-Kann · Classical', line: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7' },
  { name: 'Caro-Kann · Advance', line: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3' },
  { name: 'Scandinavian Defense', line: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5' },
  { name: 'Pirc Defense', line: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5' },
  { name: 'Alekhine Defense', line: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7' },
  { name: "Queen's Gambit Declined", line: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6' },
  { name: "Queen's Gambit Accepted", line: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6' },
  { name: 'Slav Defense', line: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O' },
  { name: 'Semi-Slav · Meran', line: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3' },
  { name: "King's Indian · Classical", line: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7' },
  { name: 'Grünfeld · Exchange', line: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3' },
  { name: 'Nimzo-Indian · Rubinstein', line: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O' },
  { name: "Queen's Indian Defense", line: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7' },
  { name: 'Catalan · Open', line: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6' },
  { name: 'Dutch · Leningrad', line: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6' },
  { name: 'Modern Benoni', line: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 Be2 O-O' },
  { name: 'London System', line: 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6 Bg3' },
  { name: 'English · Symmetrical', line: 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 Nf6 O-O O-O' },
  { name: 'English · Reversed Sicilian', line: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6' },
  { name: 'Réti Opening', line: 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3' },
].map(o => ({ ...o, moves: o.line.split(' ') }));

const clean = san => String(san || '').replace(/[?!]/g, '');

// prefix ("e4 e5 Nf3") -> Set of book replies
export function bookTree(lines = REPERTOIRE) {
  const tree = new Map();
  for (const o of lines) for (let i = 0; i < o.moves.length; i++) {
    const key = o.moves.slice(0, i).join(' ');
    if (!tree.has(key)) tree.set(key, new Set());
    tree.get(key).add(o.moves[i]);
  }
  return tree;
}
const TREE = bookTree();

// The name for the deepest book line your game followed.
export function openingName(sans = [], lines = REPERTOIRE) {
  let best = null, depth = 0;
  for (const o of lines) {
    let d = 0;
    while (d < o.moves.length && d < sans.length && clean(sans[d]) === o.moves[d]) d++;
    if (d > depth || (d === depth && d > 0 && best && o.moves.length < best.moves.length)) { best = o; depth = d; }
  }
  return depth >= 2 ? best.name : null;
}

// Where the game left the book: {ply, by:'w'|'b', played, book:[...]} or null if it never did
// (or the book simply ran out first).
export function bookExit(sans = [], tree = TREE) {
  for (let i = 0; i < sans.length; i++) {
    const next = tree.get(sans.slice(0, i).map(clean).join(' '));
    if (!next) return null;
    if (!next.has(clean(sans[i]))) return { ply: i, by: i % 2 === 0 ? 'w' : 'b', played: clean(sans[i]), book: [...next] };
  }
  return null;
}

// A drill: the position before your deviation, and the book line from there (your moves
// and the replies), as UCI, at most `maxPlies` long.
export function drillFor(sans = [], ply, { lines = REPERTOIRE, maxPlies = 6 } = {}) {
  const prefix = sans.slice(0, ply).map(clean);
  const line = lines.find(o => o.moves.length > ply && prefix.every((m, i) => o.moves[i] === m));
  if (!line) return null;
  const c = new Chess();
  for (const m of prefix) { try { c.move(m); } catch { return null; } }
  const fen = c.fen(), solution = [];
  for (const m of line.moves.slice(ply, ply + maxPlies)) {
    let mv; try { mv = c.move(m); } catch { break; }
    solution.push(mv.from + mv.to + (mv.promotion || ''));
  }
  // End on your own move, so the drill never ends waiting on a reply.
  if (solution.length % 2 === 0) solution.pop();
  return solution.length ? { fen, solution, name: line.name, ply } : null;
}

// Across your archive: per-opening record, and every drillable moment (your deviations).
export function trainerReport(entries = [], sansOf = e => e.sans || []) {
  const openings = new Map(), drills = [];
  for (const e of entries) {
    const sans = sansOf(e);
    if (sans.length < 2) continue;
    const name = openingName(sans) || 'Other openings';
    const key = `${name}|${e.myColor}`;
    const row = openings.get(key) || { name, color: e.myColor, games: 0, points: 0 };
    row.games++;
    const r = e.result, mine = e.myColor === 'w' ? '1-0' : '0-1';
    row.points += r === mine ? 1 : r === '1/2-1/2' ? 0.5 : 0;
    openings.set(key, row);
    const exit = bookExit(sans);
    if (exit && exit.by === e.myColor) {
      const drill = drillFor(sans, exit.ply);
      const same = drill && drills.find(d => d.fen === drill.fen && d.played === exit.played);
      if (same) same.times++;
      else if (drill) drills.push({ ...drill, gameId: e.id, date: e.date, played: exit.played, book: exit.book, moveNo: Math.floor(exit.ply / 2) + 1, color: e.myColor, times: 1 });
    }
  }
  const list = [...openings.values()].map(o => ({ ...o, score: Math.round((100 * o.points) / o.games) })).sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
  return { openings: list, drills: drills.sort((a, b) => b.times - a.times) };
}

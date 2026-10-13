// Measures Lozza 2.5's strength at a node budget against Stockfish 19 at a VCH bot Elo (the
// settings public/stockfish.worker.js uses, with src/engine-config.js's node budgets). The
// results are LOZZA_LEVELS in src/engine-roster.js. Development only; run after `npm run
// prepare:runtime`:
//   node scripts/calibrate-lozza.mjs <lozzaNodes> <stockfishElo> <games> [out.json]
// Games alternate colours over ten common openings; 220 plies without a result is a draw.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Chess } from 'chess.js';
import { botSearchNodes } from '../src/engine-config.js';
const SF = resolve('node_modules/stockfish/bin/stockfish-19-lite-single.js');
// Lozza is a classic script; as .cjs Node runs it outside this ES-module package.
const LOZZA = join(mkdtempSync(join(tmpdir(), 'lozza-')), 'lozza.cjs');
copyFileSync(resolve('public/engines/lozza-2.5.js'), LOZZA);
const [lozzaNodes, sfElo, games, out] = [Number(process.argv[2]), Number(process.argv[3]), Number(process.argv[4] || 16), process.argv[5]];
if (!(lozzaNodes > 0 && sfElo > 0 && games > 0)) { console.error('usage: node scripts/calibrate-lozza.mjs <lozzaNodes> <stockfishElo> <games> [out.json]'); process.exit(2); }
const sfNodes = botSearchNodes(sfElo);
const OPENINGS = ['e2e4 e7e5', 'e2e4 c7c5', 'd2d4 d7d5', 'd2d4 g8f6 c2c4 e7e6', 'c2c4 e7e5', 'e2e4 e7e6', 'e2e4 c7c6', 'g1f3 d7d5', 'd2d4 g8f6 c2c4 g7g6', 'e2e4 e7e5 g1f3 b8c6 f1b5'];

function engine(path) {
  const p = spawn(process.execPath, [path], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '', waiter = null;
  p.stdout.on('data', d => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (waiter && waiter.test(line)) { const w = waiter; waiter = null; w.resolve(line); }
    }
  });
  const send = s => p.stdin.write(s + '\n');
  const wait = test => new Promise(resolve => { waiter = { test, resolve }; });
  return { send, wait, kill: () => p.kill() };
}
const sf = engine(SF), lz = engine(LOZZA);
sf.send('uci'); await sf.wait(l => l === 'uciok');
if (sfElo < 1320) { sf.send('setoption name UCI_LimitStrength value false'); sf.send(`setoption name Skill Level value ${sfElo < 1000 ? 0 : sfElo < 1150 ? 2 : 4}`); }
else { sf.send('setoption name Skill Level value 20'); sf.send('setoption name UCI_LimitStrength value true'); sf.send(`setoption name UCI_Elo value ${sfElo}`); }
lz.send('uci'); await lz.wait(l => l === 'uciok');

let score = 0; const results = [];
for (let g = 0; g < games; g++) {
  const opening = OPENINGS[Math.floor(g / 2) % OPENINGS.length].split(' ');
  const lozzaWhite = g % 2 === 0;
  const c = new Chess();
  for (const m of opening) c.move({ from: m.slice(0, 2), to: m.slice(2, 4) });
  sf.send('ucinewgame'); lz.send('ucinewgame');
  while (!c.isGameOver() && c.history().length < 220) {
    const lozzaTurn = (c.turn() === 'w') === lozzaWhite, e = lozzaTurn ? lz : sf;
    e.send(`position fen ${c.fen()}`);
    e.send(`go nodes ${lozzaTurn ? lozzaNodes : sfNodes}`);
    const line = await e.wait(l => l.startsWith('bestmove'));
    const uci = line.split(/\s+/)[1];
    let ok = null; try { ok = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }); } catch {}
    if (!ok) { console.error('illegal', uci, c.fen()); break; }
  }
  let s = 0.5;
  if (c.isCheckmate()) s = (c.turn() === 'w') === lozzaWhite ? 0 : 1;
  score += s; results.push(s);
  console.log(`game ${g + 1}: lozza ${lozzaWhite ? 'W' : 'B'} ${s} (${c.history().length} plies) running ${score}/${g + 1}`);
}
const p = Math.min(0.99, Math.max(0.01, score / games));
const elo = Math.round(sfElo + 400 * Math.log10(p / (1 - p)));
if (out) writeFileSync(out, JSON.stringify({ lozzaNodes, sfElo, sfNodes, games, score, estimate: elo, results }));
console.log(`lozza ${lozzaNodes} nodes vs SF ${sfElo}: ${score}/${games} -> ~${elo}`);
sf.kill(); lz.kill();
process.exit(0);

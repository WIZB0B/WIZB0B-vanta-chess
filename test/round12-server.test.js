import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { zhPlay, zhState } from '../supabase/functions/chess/crazyhouse.js';
import { BUGHOUSE_SEATS, boardResultFor, bughouseStatus, bughouseTransfer, checkIsBlockable, matchWinner, otherBoard, partnerSeat, teamOfSeat } from '../supabase/functions/chess/bughouse.js';
import { CREST_CHARGES, DEFAULT_CREST, FATES, cleanCrest, fateById, gamePgn, pickFate, twinScore } from '../supabase/functions/chess/rules.js';
import { FAMOUS_GAMES } from '../src/content.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261012120000_round12_bughouse_twins_heraldry.sql', import.meta.url), 'utf8');

test('bughouse seats: teams, partners and boards', () => {
  assert.deepEqual(BUGHOUSE_SEATS, ['aw', 'ab', 'bw', 'bb']);
  assert.equal(teamOfSeat('aw'), 1); assert.equal(teamOfSeat('bb'), 1);
  assert.equal(teamOfSeat('ab'), 2); assert.equal(teamOfSeat('bw'), 2);
  assert.equal(partnerSeat('aw'), 'bb'); assert.equal(partnerSeat('ab'), 'bw'); assert.equal(partnerSeat('zz'), null);
  assert.equal(otherBoard('a'), 'b'); assert.equal(otherBoard('b'), 'a');
});

test('bughouse: a capture goes to the partner, as the partner\'s colour; a drop spends your pocket', () => {
  let fen = new Chess().fen(), st = zhState({ w: {}, b: {} }, []);
  for (const [from, to] of [['e2', 'e4'], ['d7', 'd5']]) { const r = zhPlay(Chess, fen, st, { from, to }); fen = r.fen; st = r.state; }
  const take = zhPlay(Chess, fen, st, { from: 'e4', to: 'd5' });
  const t = bughouseTransfer('a', 'w', st, take.state);
  assert.deepEqual(t, { spent: null, gift: { board: 'b', color: 'b', piece: 'p' } }, 'White on A captures a pawn: Black on B (the partner) gets it');
  const dropBefore = zhState({ w: { n: 1 }, b: {} }, []);
  const drop = zhPlay(Chess, new Chess().fen(), dropBefore, { drop: 'n', to: 'e3' });
  assert.deepEqual(bughouseTransfer('b', 'w', dropBefore, drop.state), { spent: 'n', gift: null });
  // a promoted queen is captured as a pawn, and the pawn goes to the partner
  const promo = zhState({ w: {}, b: {} }, ['d5']);
  const q = zhPlay(Chess, 'k7/8/4b3/3Q4/8/8/8/K7 b - - 0 1', promo, { from: 'e6', to: 'd5' });
  assert.ok(q, 'Bxd5 is legal');
  assert.deepEqual(bughouseTransfer('a', 'b', promo, q.state).gift, { board: 'b', color: 'w', piece: 'p' });
});

test('bughouse mate: a check you could block with a dropped piece is not mate; nobody is stalemated', () => {
  const empty = zhState({ w: {}, b: {} }, []);
  // Back-rank rook check from a distance: blockable by a drop (now or later) -> not over, "waiting"
  const rookCheck = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'); rookCheck.move('Ra8+');
  assert.equal(rookCheck.isCheckmate(), true, 'plain chess calls this mate');
  assert.equal(checkIsBlockable(rookCheck), true);
  const s1 = bughouseStatus(Chess, rookCheck, empty);
  assert.equal(s1.over, false); assert.equal(s1.waiting, true);
  // With a piece in hand to block, zhStatus already knows it isn't mate
  assert.equal(bughouseStatus(Chess, rookCheck, zhState({ w: {}, b: { n: 1 } }, [])).over, false);
  // A knight's check can't be blocked: mate
  const smother = new Chess('6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1'); smother.move('Nf7#');
  assert.equal(checkIsBlockable(smother), false);
  const s2 = bughouseStatus(Chess, smother, empty);
  assert.equal(s2.over, true); assert.equal(s2.result, '1-0'); assert.equal(s2.reason, 'checkmate');
  // Stalemate in chess: in bughouse the player waits for a piece instead
  const stale = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(stale.isStalemate(), true);
  const s3 = bughouseStatus(Chess, stale, empty);
  assert.equal(s3.over, false); assert.equal(s3.waiting, true);
  // A double check can't be blocked either (rook on e1 uncovered, bishop checks from g6)
  const dbl = new Chess('4k3/8/8/8/4B3/8/8/4R1K1 w - - 0 1'); dbl.move('Bg6+');
  assert.equal(dbl.attackers('e8', 'w').length, 2);
  assert.equal(checkIsBlockable(dbl), false);
});

test('bughouse: the first board to finish decides both boards, consistently', () => {
  // White wins on A: team 1 (A-White + B-Black) wins; on B that means Black won.
  assert.equal(matchWinner('a', '1-0'), 'team1');
  assert.deepEqual(boardResultFor('b', 'team1'), { status: 'black_won', result: '0-1' });
  assert.equal(matchWinner('b', '1-0'), 'team2');
  assert.deepEqual(boardResultFor('a', 'team2'), { status: 'black_won', result: '0-1' });
  assert.equal(matchWinner('a', '0-1'), 'team2');
  assert.deepEqual(boardResultFor('b', 'team2'), { status: 'white_won', result: '1-0' });
  assert.equal(matchWinner('b', '1/2-1/2'), 'draw');
  assert.deepEqual(boardResultFor('a', 'draw'), { status: 'draw', result: '1/2-1/2' });
  assert.equal(matchWinner('a', '*'), null);
  for (const board of ['a', 'b']) for (const result of ['1-0', '0-1']) {
    const w = matchWinner(board, result), other = boardResultFor(otherBoard(board), w);
    assert.equal(matchWinner(otherBoard(board), other.result), w, 'both boards name the same winning team');
  }
});

test('twin fates: every position is real, legal and still being played', () => {
  assert.ok(FATES.length >= 10);
  const ids = new Set();
  for (const f of FATES) {
    assert.match(f.id, /^[a-z0-9-]{2,40}$/); assert.ok(!ids.has(f.id)); ids.add(f.id);
    const c = new Chess(f.fen);
    assert.equal(c.isGameOver(), false, f.id);
    assert.ok(f.fen.length <= 100 && f.title && f.note);
  }
  // the famous-game positions are exactly the games in the app, at the stated move
  const at = (title, ply) => { const c = new Chess(); for (const m of FAMOUS_GAMES.find(g => g.title === title).moves.slice(0, ply)) c.move(m); return c.fen(); };
  assert.equal(fateById('opera').fen, at('The Opera Game', 16));
  assert.equal(fateById('immortal').fen, at('The Immortal Game', 16));
  assert.equal(fateById('century').fen, at('Game of the Century', 22));
  assert.equal(fateById('kasparov').fen, at("Kasparov's Immortal", 36));
  assert.equal(fateById('deep-blue').fen, at('Deep Blue – Game 6', 14));
  const line = moves => { const c = new Chess(); for (const m of moves) c.move(m); return c.fen(); };
  assert.equal(fateById('najdorf').fen, line(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']));
  assert.equal(fateById('dragon').fen, line(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O']));
  assert.equal(pickFate('century').id, 'century');
  assert.equal(pickFate('nope', () => 0).id, FATES[0].id, 'unknown fates fall back to a random one');
});

test('twin fates: the combined score over both legs', () => {
  assert.deepEqual(twinScore('1-0', '1-0'), { first: 1, second: 1, done: true }, 'each won with White');
  assert.deepEqual(twinScore('1-0', '0-1'), { first: 2, second: 0, done: true });
  assert.deepEqual(twinScore('1/2-1/2', '0-1'), { first: 1.5, second: 0.5, done: true });
  assert.deepEqual(twinScore('0-1', '1/2-1/2'), { first: 0.5, second: 1.5, done: true });
  assert.deepEqual(twinScore('1-0', null), { first: 1, second: 0, done: false });
  assert.deepEqual(twinScore('*', null), { first: 0, second: 0, done: false });
});

test('heraldry: only known shields, divisions, tinctures and charges are kept', () => {
  assert.deepEqual(cleanCrest(DEFAULT_CREST), DEFAULT_CREST);
  assert.equal(cleanCrest({ ...DEFAULT_CREST, charge: 'dragon' }), null);
  assert.equal(cleanCrest({ ...DEFAULT_CREST, field: '#ff0000' }), null);
  assert.equal(cleanCrest(null), null); assert.equal(cleanCrest([]), null); assert.equal(cleanCrest('x'), null);
  const extra = cleanCrest({ ...DEFAULT_CREST, evil: '<script>' });
  assert.deepEqual(Object.keys(extra).sort(), ['charge', 'division', 'field', 'field2', 'ink', 'shield']);
  assert.ok(CREST_CHARGES.includes('knight') && CREST_CHARGES.includes('none'));
});

test('records: bughouse and twin games are labelled; the partner board ending is named', () => {
  const bug = gamePgn({ variant: 'bughouse', bughouse_board: 'b' }, [{ san: 'e4' }, { san: 'N@f6' }], '0-1', 'partner');
  assert.match(bug, /\[Event "VCH Bughouse"\]/); assert.match(bug, /\[Variant "Bughouse"\]\n\[Board "B"\]/);
  assert.match(bug, /\[Termination "decided on the partner board"\]/); assert.doesNotMatch(bug, /\[FEN /);
  const twin = gamePgn({ twin_id: 'x', start_fen: fateById('opera').fen }, [{ san: 'Bg5' }], '*');
  assert.match(twin, /\[Event "VCH Twin Fates"\]/); assert.match(twin, /\[SetUp "1"\]\n\[FEN "rn2kb1r/);
});

test('server: bughouse wiring (moves, pockets one piece at a time, match end, refusals)', () => {
  for (const a of ['bughouse_create', 'bughouse_join', 'bughouse_leave', 'bughouse_state', 'twin_create', 'twin_state', 'fates', 'club_crest']) assert.match(fn, new RegExp(`case "${a}":`), a);
  assert.match(fn, /\}else if\(g\.variant==="crazyhouse"\|\|g\.variant==="bughouse"\)\{/);
  assert.match(fn, /g\.variant==="bughouse"&&zhNext\?bughouseStatus\(Chess,c,zhNext\)/, 'bughouse mate rule');
  assert.match(fn, /\.\.\.\(g\.variant==="bughouse"\?\{\}:\{zh_pockets:zhNext\.pockets\}\)/, 'the move never rewrites bughouse pockets');
  assert.match(fn, /admin\.rpc\("chess_bughouse_pocket",\{p_game:g\.id,p_color:color,p_piece:bug\.spent,p_delta:-1\}\)/);
  assert.match(fn, /async function bughouseGift[\s\S]{0,400}p_delta:1/);
  assert.match(fn, /if\(g\.bughouse_id\)await bughouseFinish\(g\)/);
  assert.match(fn, /async function bughouseFinish[\s\S]{0,500}\.eq\("status","active"\)\.select\(\)\.maybeSingle\(\);\s*if\(!room\)return;/, 'only one request ends a match');
  assert.match(fn, /end_reason:"partner"/);
  assert.match(fn, /data\?\.bughouse_id\)EdgeRuntime\.waitUntil\(bughouseAbort\(data\)/);
  assert.match(fn, /const patch=g\.variant!=="bughouse"&&!sideCanPossiblyMate\(c,winner\)/, 'a bughouse clock always loses');
  assert.match(fn, /if\(g\.variant==="bughouse"\)throw fail\("There are no draw offers in Bughouse\.",409\)/);
  assert.match(fn, /if\(g\.variant==="bughouse"\|\|g\.variant==="crazyhouse"\)throw fail\("Takebacks aren't available in drop games\.",409\)/);
  // seats change only with the version the request saw
  assert.match(fn, /\.eq\("seat_version",Number\(m\.seat_version\|\|0\)\)/);
  // spectators see names only, never player ids
  assert.match(fn, /seats=Object\.fromEntries\(BUGHOUSE_SEATS\.map\(s=>\[s,m\.seats\?\.\[s\]\?\{name:m\.seats\[s\]\.name,me:/);
  assert.doesNotMatch(fn.match(/const BUGHOUSE_GAME_FIELDS=\[[^\]]*\]/)[0], /player_id/);
  assert.match(fn, /eq\("created_by",p\.id\)\.eq\("status","waiting"\)[\s\S]{0,80}>=3\)throw fail/, 'open tables are limited');
});

test('server: twin fates, heraldry, hall of relics, explorer', () => {
  assert.match(fn, /if\(g\.twin_id&&Number\(g\.twin_leg\)===1\)\{const next=await twinNext\(g\)/);
  assert.match(fn, /async function twinNext[\s\S]{0,300}\.eq\("status","first"\)\.select\(\)\.maybeSingle\(\);if\(!t\)return null;/, 'the second leg is created once');
  assert.match(fn, /players:\[w,bl\],startFen:t\.start_fen,twinId:t\.id,twinLeg:2/);
  assert.match(fn, /const \[w,bl\]=await Promise\.all\(\[playerById\(g\.black_player_id\),playerById\(g\.white_player_id\)\]\)/, 'colours swap');
  assert.match(fn, /if\(customStart&&\(zh\|\|dailyDays\)\)throw fail/);
  assert.match(fn, /async function twinState[\s\S]{0,400}\.includes\(p\.id\)\)throw fail\("Twin Fates match not found\.",404\)/, 'only the two players read it');
  assert.match(fn, /async function clubCrest[\s\S]{0,400}m\.role==="owner"\)\)throw fail\("Only the club's owner can change its crest\.",403\)/);
  assert.match(fn, /const crest=b\.crest===null\?null:cleanCrest\(b\.crest\)/);
  assert.match(fn, /const clubCard=\(c:any\)=>\(\{[^}]*crest:cleanCrest\(c\.crest\)\}\)/);
  assert.match(fn, /club:clubs\.get\(x\.id\)\|\|null/);
  assert.match(fn, /moments=await momentsWonBy\(t\.id\)/);
  assert.match(fn, /if\(pick\?\.game_id&&pick\.picked_by\)/, 'only admin picks override the automatic moment');
  assert.match(fn, /if\(moment\?\.gameId&&!pick\?\.picked_by\)/, 'the automatic pick is remembered without replacing an admin pick');
  assert.match(fn, /g\.variant!=="standard"\|\|g\.start_fen\|\|Number\(g\.move_count\|\|0\)<6\)return; \/\/ only standard games from the usual start/);
});

test('migration: server-only tables, the pocket function only for the chess function, bughouse variant', () => {
  assert.match(sql, /alter table public\.chess_bughouse enable row level security;/);
  assert.match(sql, /alter table public\.chess_twins enable row level security;/);
  assert.match(sql, /using \(false\) with check \(false\)/);
  assert.match(sql, /revoke all on function public\.chess_bughouse_pocket\(uuid, text, text, integer\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.chess_bughouse_pocket\(uuid, text, text, integer\) to service_role;/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /check \(variant in \('standard','freestyle','crazyhouse','bughouse'\)\)/);
  assert.match(sql, /'crazyhouse','bughouse'\)\);/);
  assert.match(sql, /octet_length\(crest::text\) <= 400/);
});
test('server: a player reloading their Bughouse board finds the table by the board', () => {
  assert.match(fn, /if\(b\.gameId\)\{const g=await gameById\(String\(b\.gameId\)\);m=g\?\.bughouse_id\?await one\("chess_bughouse","id",g\.bughouse_id\):null\}/);
  // The view never carries player ids: seats are names and "me".
  assert.match(fn, /const seats=Object\.fromEntries\(BUGHOUSE_SEATS\.map\(s=>\[s,m\.seats\?\.\[s\]\?\{name:m\.seats\[s\]\.name,me:m\.seats\[s\]\.id===viewerId\}:null\]\)\);/);
});

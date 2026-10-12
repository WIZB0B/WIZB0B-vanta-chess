import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHARGE_NAMES, CREST_CHARGES, CREST_DIVISIONS, CREST_SHIELDS, CREST_TINCTURES, DEFAULT_CREST, DIVISION_NAMES, SHIELD_NAMES, TINCTURES, TINCTURE_NAMES, cleanCrest, crestSvg, crestText } from '../src/heraldry.js';
import { FATES, points, twinScore } from '../src/twin-fates.js';
import { BUGHOUSE_SEATS, bughouseStatus, partnerSeat, teamOfSeat } from '../src/bughouse.js';
import { Chess } from 'chess.js';

test('heraldry: every choice has a name and a colour, and draws', () => {
  for (const t of CREST_TINCTURES) { assert.match(TINCTURES[t], /^#[0-9a-f]{6}$/); assert.ok(TINCTURE_NAMES[t]); }
  for (const s of CREST_SHIELDS) assert.ok(SHIELD_NAMES[s]);
  for (const d of CREST_DIVISIONS) assert.ok(DIVISION_NAMES[d]);
  for (const c of CREST_CHARGES) assert.ok(CHARGE_NAMES[c]);
  for (const shield of CREST_SHIELDS) for (const division of CREST_DIVISIONS) for (const charge of CREST_CHARGES) {
    const svg = crestSvg({ shield, division, field: 'azure', field2: 'or', charge, ink: 'argent' });
    assert.match(svg, /^<svg class="crest" viewBox="0 0 100 120"/); assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${shield} ${division} ${charge}`);
  }
});
test('heraldry: crests are cleaned, ids never collide, labels cannot inject markup', () => {
  assert.equal(cleanCrest({ ...DEFAULT_CREST, field: 'url(javascript:1)' }), null);
  assert.equal(cleanCrest('knight'), null);
  const bad = crestSvg({ shield: '"><script>', charge: 'evil' }, { label: '"><img src=x onerror=alert(1)>' });
  assert.ok(!bad.includes('<script') && !bad.includes('<img') && !bad.includes('onerror="'), 'only known shapes and a stripped label');
  assert.ok(bad.includes(TINCTURES[DEFAULT_CREST.field]), 'an invalid crest shows the default');
  const ids = [crestSvg(DEFAULT_CREST), crestSvg(DEFAULT_CREST)].map(s => /clipPath id="([^"]+)"/.exec(s)[1]);
  assert.notEqual(ids[0], ids[1]);
  assert.equal(crestText({ shield: 'kite', division: 'pale', field: 'gules', field2: 'sable', charge: 'crown', ink: 'or' }), 'Red and black, a gold crown');
  assert.equal(crestText({ ...DEFAULT_CREST, division: 'plain', charge: 'none' }), 'Black');
});
test('twin fates: eleven famous positions, scores add up over both games', () => {
  assert.equal(FATES.length, 11);
  for (const f of FATES) { const c = new Chess(); c.load(f.fen); assert.ok(!c.isGameOver(), f.id); assert.ok(f.title && f.note); }
  assert.deepEqual(twinScore('1-0', '1/2-1/2'), { first: 1.5, second: 0.5, done: true });
  assert.deepEqual(twinScore('0-1', null), { first: 0, second: 1, done: false });
  assert.equal(points(1.5), '1½'); assert.equal(points(0.5), '½'); assert.equal(points(2), '2'); assert.equal(points(0), '0');
});
test('bughouse: seats, teams and partners in the browser match the server', () => {
  assert.deepEqual(BUGHOUSE_SEATS, ['aw', 'ab', 'bw', 'bb']);
  assert.equal(teamOfSeat('aw'), teamOfSeat('bb')); assert.equal(teamOfSeat('ab'), teamOfSeat('bw')); assert.notEqual(teamOfSeat('aw'), teamOfSeat('ab'));
  assert.equal(partnerSeat('aw'), 'bb'); assert.equal(partnerSeat('ab'), 'bw');
  // Back-rank "mate" by a rook: a dropped piece could block it, so the game goes on.
  const c = new Chess('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1');
  assert.equal(bughouseStatus(Chess, c, { pockets: { w: {}, b: {} }, promoted: [] }).over, false);
});
test('round 12 social features are wired into the app', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /function isZhGame\(\)\{const g=watchSession\?\.state\|\|serverGame;return \['crazyhouse','bughouse'\]\.includes\(g\?\.variant\)/);
  assert.ok(!/zhStatus\(Chess,game,zhClientState\(\)\)/.test(main), 'every status check goes through zhGameStatus');
  assert.match(main, /function handleRealtimeMessage\(message\)\{\n  mergeBughousePockets\(message\);/);
  assert.match(main, /if\(reason==='partner'\)return 'on the partner board';/);
  assert.match(main, /if\(entry\.variant==='bughouse'\)return toast/);
  assert.match(main, /\$\('#create'\)\.onclick=async\(\)=>\{if\(\$\('#variant'\)\.value==='bughouse'\)return void createBughouse\(\);if\(\$\('#variant'\)\.value==='twin'\)return renderFates\(\);/);
  // Team calls go on a channel of their own, never the opponents' game channel.
  assert.match(main, /channel\(`bughouse:\$\{b\.id\}:team\$\{teamOfSeat\(seat\)\}`/);
  assert.ok(main.indexOf('bhSession=null') < main.indexOf('function renderBoard('));
});

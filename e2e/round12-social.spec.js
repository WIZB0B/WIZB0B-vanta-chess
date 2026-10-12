import { test, expect } from '@playwright/test';

// Round 12 features that use the game server: Vanta Bughouse, Twin Fates, club heraldry and the
// Hall of Relics. The server is mocked with the shapes the chess function returns.
const json = (route, body) => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...body }) });
const boot = page => page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('Vanta Bughouse: a table fills, the match starts on your board, your partner plays beside you', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  const now = new Date().toISOString();
  const seats = { aw: { name: 'Me', me: true }, ab: null, bw: null, bb: null };
  let table = { bughouse: { id: 'bh1', code: 'BHTEST01', status: 'waiting', seats, winner: null, time_control_seconds: 180, increment_seconds: 0 }, games: { a: null, b: null }, seat: 'aw' };
  const boardA = { id: 'ga', invite_code: 'BHA00001', bughouse_id: 'bh1', bughouse_board: 'a', variant: 'bughouse', pool: 'bughouse', rated: false, white_player_id: 'me', black_player_id: 'o1', white_name: 'Me', black_name: 'Rook Rider', status: 'active', result: '*', fen: START, version: 1, move_count: 0, move_history: [], zh_pockets: { w: { n: 1 }, b: {} }, zh_promoted: [], time_control_seconds: 180, increment_seconds: 0, white_time_ms: 180000, black_time_ms: 180000, last_move_at: now, started_at: now };
  const boardB = { id: 'gb', invite_code: 'BHB00001', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', version: 3, status: 'active', result: '*', white_name: 'Queen Bee', black_name: 'Partner Pat', white_time_ms: 170000, black_time_ms: 175000, last_move_at: now, zh_pockets: { w: {}, b: { p: 2 } }, move_count: 2 };
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const map = { profile: { player: { id: 'me' } }, bughouse_create: table, bughouse_state: table, join: { game: boardA, seat: 'w', player: { id: 'me' } }, state: { game: boardA, seat: 'w' }, heartbeat: { game: boardA, seat: 'w' }, chat_list: { messages: [] }, game_players: { players: [] } };
    await json(route, map[body.action] || {});
  });
  await page.goto('/');
  await page.locator('#variant').selectOption('bughouse');
  await page.locator('#create').click();
  await expect(page.locator('.bh-seat')).toHaveCount(4);
  await expect(page.locator('.bughouse .gauntlet-head')).toContainText('1 / 4 seated');
  await expect(page.locator('.bh-seat.me')).toContainText('Board A · White');
  await expect(page.locator('[data-bh-seat]')).toHaveCount(3);
  expect(page.url()).toContain('?bughouse=BHTEST01');
  // The fourth player sits down: the server starts both boards.
  table = { ...table, team_key: 'teamkey0123456789abcdef0', bughouse: { ...table.bughouse, status: 'active', seats: { aw: { name: 'Me', me: true }, ab: { name: 'Rook Rider' }, bw: { name: 'Queen Bee' }, bb: { name: 'Partner Pat' } } }, games: { a: boardA, b: boardB } };
  await expect(page.locator('#topPlayerName')).toHaveText('Rook Rider', { timeout: 12000 });
  await expect(page.locator('#bottomCaptured .zh-piece[data-drop="n"]')).toHaveCount(1);
  const strip = page.locator('#bhPartner');
  await expect(strip).toBeVisible();
  await expect(strip.locator('.bh-row.mine > b')).toHaveText('Partner Pat');
  await expect(strip.locator('.bh-row.mine .zh-piece b')).toHaveText('2');
  await expect(strip.locator('.bh-board .piece')).toHaveCount(32);
  await expect(strip.locator('[data-bh-call]')).toHaveCount(9);
  await expect(page.locator('.bughouse .gauntlet-head')).toContainText('Playing');
});

test('Twin Fates: pick a famous position, the game starts from it, the match line shows both games', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  const OPERA = 'rn2kb1r/pp2qppp/2p2n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R w KQkq - 0 9';
  let sent = null;
  const g = { id: 'gt1', invite_code: 'TWIN0001', twin_id: 't1', twin_leg: 1, start_fen: OPERA, fen: OPERA, variant: 'standard', pool: 'blitz', rated: false, white_player_id: 'me', black_player_id: null, white_name: 'Me', black_name: null, status: 'waiting', result: '*', version: 0, move_count: 0, move_history: [], time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000 };
  const twin = { id: 't1', fate: 'opera', title: 'The Opera box', note: 'Morphy vs the Duke and the Count, Paris 1858, after 8...c6', status: 'first', legs: [{ leg: 1, id: 'gt1', code: 'TWIN0001', status: 'waiting', result: '*', white: 'Me', black: null }], score: { first: { name: 'Me', points: 0 }, second: { name: 'Black', points: 0 }, done: false } };
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    if (body.action === 'twin_create') sent = body;
    const map = { profile: { player: { id: 'me' } }, twin_create: { game: g, seat: 'w', player: { id: 'me' }, twin }, state: { game: g, seat: 'w', twin }, heartbeat: { game: g, seat: 'w', twin }, twin_state: { twin }, chat_list: { messages: [] } };
    await json(route, map[body.action] || {});
  });
  await page.goto('/');
  await page.locator('#variant').selectOption('twin');
  await page.locator('#create').click();
  await expect(page.locator('.fate')).toHaveCount(11);
  await page.locator('[data-fate="opera"]').click();
  await expect.poll(() => sent?.fate).toBe('opera');
  await expect(page.locator('#twinLine')).toBeVisible();
  await expect(page.locator('#twinLine')).toContainText('The Opera box');
  await expect(page.locator('#twinLine')).toContainText('Game 1 of 2');
  await expect(page.locator('.board-piece[data-square="b3"]')).toHaveAttribute('data-piece', 'wq');
  await expect(page.locator('.twin .gauntlet-stages li')).toHaveCount(2);
});

test('Heraldry: a club owner designs a crest, and the club shows it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) });
  let crest = null, saved = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    if (body.action === 'club_crest') { saved = body; crest = body.crest; }
    const club = { id: 'c1', slug: 'knights', name: 'Knights', member_count: 2, description: '', crest };
    const map = { profile: { player: { id: 'me', username: 'me', account: true } }, club_view: { club, members: [], messages: [], member: true, role: 'owner' }, club_crest: { club }, club_list: { clubs: [club], mine: { ...club, role: 'owner' } } };
    await json(route, map[body.action] || {});
  });
  await page.goto('/?club=knights');
  await page.locator('.club-crest-edit').click();
  await expect(page.locator('.crest-preview svg')).toBeVisible();
  await page.locator('[data-crest="field"]').selectOption('azure');
  await page.locator('[data-crest="charge"]').selectOption('rook');
  await page.locator('[data-crest="division"]').selectOption('quarterly');
  await page.getByRole('button', { name: 'Save crest' }).click();
  await expect.poll(() => saved?.crest).toEqual({ shield: 'heater', division: 'quarterly', field: 'azure', field2: 'or', charge: 'rook', ink: 'or' });
  expect(saved.slug).toBe('knights');
  await expect(page.locator('.club .club-crest.big svg')).toBeVisible();
  await expect(page.locator('.club-crest-edit')).toHaveText('Edit crest');
});

test('Hall of Relics: your profile shows your Moments, crest, relics, campaign and honor', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Same panel on phones');
  await page.addInitScript(() => {
    localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' }));
    localStorage.setItem('vch.relics', JSON.stringify({ unlocked: { umbra: '2026-10-01', ashen: '2026-10-02' } }));
    localStorage.setItem('vch.campaign', JSON.stringify({ won: { 'ashen-0': { stars: 3 }, 'ashen-1': { stars: 2 }, 'ashen-2': { stars: 1 } } }));
    localStorage.setItem('vch.oaths', JSON.stringify({ honor: 12, sworn: 6, kept: 4, history: [] }));
  });
  const crest = { shield: 'kite', division: 'pale', field: 'gules', field2: 'sable', charge: 'crown', ink: 'or' };
  const PROFILE = { player: { id: 'me', username: 'me', ratings: { rapid: 1300 }, provisional_games: {}, wins: 3, losses: 1, draws: 0, rated_games: 4, puzzle_rating: 1500, achievements: [], member_since: '2026-08', online: true }, history: [], bestWins: [], recent: [], headToHead: null, following: false, self: true, club: { slug: 'knights', name: 'Knights', crest }, division: 'Bronze',
    moments: [{ week: '2026-W40', caption: 'Queen sacrifice', fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', opponent: 'Opp' }] };
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const map = { profile: { player: { id: 'me', username: 'me', account: true } }, public_profile: PROFILE, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] } };
    await json(route, map[body.action] || {});
  });
  await page.goto('/?player=me');
  const hall = page.locator('.hall');
  await expect(hall).toBeVisible();
  await expect(hall.locator('.hall-moment')).toHaveCount(1);
  await expect(hall.locator('.hall-moment')).toContainText('Queen sacrifice');
  await expect(hall.locator('.hall-crest')).toContainText('Red and black, a gold crown');
  await expect(hall.locator('.hall-stats')).toContainText('2 / 13');
  await expect(hall.locator('.hall-stats')).toContainText('6 / 45');
  await expect(hall.locator('.hall-stats')).toContainText('12');
  await expect(hall.locator('.hall-relic')).toHaveCount(2);
  await expect(hall.locator('.hall-realms')).toContainText('The Ashen March');
  await expect(page.locator('.pp-head .pp-crest svg')).toBeVisible();
});

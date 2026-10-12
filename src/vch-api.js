const DEFAULT_ENDPOINT = 'https://ubjldcfiwrwiouwgmduo.supabase.co/functions/v1/chess';
// The database lives in us-east-2. Without this, Supabase runs the function in the region
// nearest the player (Frankfurt for West Africa), and every database call inside it then
// crosses the Atlantic: about a second per move. Pinning the region makes that one hop.
export const FUNCTION_REGION = 'us-east-2';
export function regionalEndpoint(endpoint, region = FUNCTION_REGION) {
  const url = new URL(endpoint);
  if (region) url.searchParams.set('forceFunctionRegion', region);
  return url.toString();
}

export class VchApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'VchApiError';
    this.status = status;
    this.code = code;
  }
}

export class VchApi {
  constructor({ endpoint = import.meta.env?.VITE_CHESS_API_URL || DEFAULT_ENDPOINT, token, accessToken } = {}) {
    if (!/^https:\/\/[a-z0-9.-]+\/functions\/v1\/chess$/.test(endpoint)) {
      throw new Error('Invalid authoritative chess API endpoint');
    }
    this.endpoint = regionalEndpoint(endpoint);
    this.token = token;
    this.accessToken = accessToken;
  }

  async request(action, payload = {}, { signal } = {}) {
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (this.accessToken) headers.authorization = `Bearer ${this.accessToken}`;
    // No `cache: 'no-store'`: POST responses are never cached anyway, and in Chrome that
    // mode also bypasses the CORS preflight cache, adding a full OPTIONS round trip to
    // every move.
    const response = await fetch(this.endpoint, {
      method: 'POST', headers, signal, referrerPolicy: 'no-referrer',
      // The request's own fields come last, so a payload field can never replace them.
      body: JSON.stringify({ ...payload, action, ...(this.token ? { token: this.token } : {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw new VchApiError(data.error?.message || data.message || 'Chess service request failed', response.status, data.error?.code);
    }
    return data;
  }

  profile(name) { return this.request('profile', { name }); }
  profileUpdate(changes) { return this.request('profile_update', changes); }
  gamePlayers(gameId) { return this.request('game_players', { gameId }); }
  create(options) { return this.request('create', options); }
  join(code, name) { return this.request('join', { code, name }); }
  move(gameId, expectedVersion, move) { return this.request('move', { gameId, expectedVersion, ...move }); }
  botMove(gameId, expectedVersion, move) { return this.request('bot_move', { gameId, expectedVersion, ...move }); }
  state(gameId) { return this.request('state', { gameId }); }
  history(gameId) { return this.request('history', { gameId }); }
  archive(limit = 60) { return this.request('history', { limit }); }
  heartbeat(gameId) { return this.request('heartbeat', { gameId }); }
  resign(gameId) { return this.request('resign', { gameId }); }
  claimWin(gameId, outcome = 'win') { return this.request('claim_win', { gameId, outcome }); }
  takebackOffer(gameId) { return this.request('takeback_offer', { gameId }); }
  takebackRespond(gameId, accept) { return this.request('takeback_respond', { gameId, accept }); }
  liveGames() { return this.request('live_games'); }
  watchState(gameId) { return this.request('watch_state', { gameId }); }
  drawOffer(gameId) { return this.request('draw_offer', { gameId }); }
  drawCancel(gameId) { return this.request('draw_cancel', { gameId }); }
  drawRespond(gameId, accept) { return this.request('draw_respond', { gameId, accept }); }
  chatList(gameId, limit = 60) { return this.request('chat_list', { gameId, limit }); }
  chatSend(gameId, message, clientNonce = crypto.randomUUID()) { return this.request('chat_send', { gameId, message, clientNonce }); }
  puzzleNext(difficulty = 'normal', rating = 1400, angle = null) { return this.request('puzzle_next', { difficulty, rating, ...(angle ? { angle } : {}) }); }
  puzzleAttempt(payload) { return this.request('puzzle_attempt', payload); }
  queueJoin(options) { return this.request('queue_join', options); }
  queueStatus(rated = false) { return this.request('queue_status', { rated, allowBots: !rated }); }
  queueLeave() { return this.request('queue_leave'); }
  tournaments() { return this.request('tournaments'); }
  tournamentJoin(tournamentId) { return this.request('tournament_join', { tournamentId }); }
  tournamentStandings(tournamentId) { return this.request('tournament_standings', { tournamentId }); }
  bots() { return this.request('bots'); }
  berserk(gameId) { return this.request('berserk', { gameId }); }
  playerSearch(q) { return this.request('player_search', { q }); }
  follow(playerId, on = true) { return this.request('follow', { playerId, on }); }
  friends() { return this.request('friends'); }
  challengeSend(payload) { return this.request('challenge_send', payload); }
  challenges() { return this.request('challenges'); }
  challengeRespond(challengeId, accept) { return this.request('challenge_respond', { challengeId, accept }); }
  challengeCancel(challengeId) { return this.request('challenge_cancel', { challengeId }); }
  dailyGames() { return this.request('daily_games'); }
  pushSubscribe(subscription) { return this.request('push_subscribe', subscription); }
  pushUnsubscribe(endpoint) { return this.request('push_unsubscribe', { endpoint }); }
  puzzleDaily() { return this.request('puzzle_daily'); }
  puzzleStats() { return this.request('puzzle_stats'); }
  puzzleStreakRecord(count) { return this.request('puzzle_streak_record', { count }); }
  achievements() { return this.request('achievements'); }
  mistakesFixed(count) { return this.request('mistakes_fixed', { count }); }
  fairplaySignal(payload) { return this.request('fairplay_signal', payload); }
  reportPlayer(payload) { return this.request('report_player', payload); }
  publicProfile(username) { return this.request('public_profile', { username }); }
  clubList(q = '') { return this.request('club_list', { q }); }
  clubView(slug) { return this.request('club_view', { slug }); }
  clubCreate(payload) { return this.request('club_create', payload); }
  clubJoin(slug) { return this.request('club_join', { slug }); }
  clubLeave() { return this.request('club_leave'); }
  clubChat(slug, body) { return this.request('club_chat', { slug, body }); }
  league(division = null) { return this.request('league', division === null ? {} : { division }); }
  conditionalList(gameId) { return this.request('conditional_list', { gameId }); }
  conditionalSet(gameId, lines) { return this.request('conditional_set', { gameId, lines }); }
  modQueue() { return this.request('mod_queue'); }
  modPlayer(playerId) { return this.request('mod_player', { playerId }); }
  modAction({ action, ...rest }) { return this.request('mod_action', { ...rest, act: action }); } // "action" is the request's own field
  studySave(payload) { return this.request('study_save', payload); }
  studyGet(code) { return this.request('study_get', { code }); }
  studyList() { return this.request('study_list'); }
  studyDelete(code) { return this.request('study_delete', { code }); }
  tournamentCreate(payload) { return this.request('tournament_create', payload); }
  accountExport() { return this.request('account_export'); }
  accountDelete(confirm) { return this.request('account_delete', { confirm }); }
  notifications() { return this.request('notifications'); }
  notificationsRead(ids = null) { return this.request('notifications_read', ids ? { ids } : {}); }
  openingExplorer(fen, { mine = false } = {}) { return this.request('opening_explorer', mine ? { fen, mine: true } : { fen }); }
  tournamentLobby(tournamentId) { return this.request('tournament_lobby', { tournamentId }); }
  repertoireGet() { return this.request('repertoire_get'); }
  repertoireSave(color, lines) { return this.request('repertoire_save', { color, lines }); }
  insights() { return this.request('insights'); }
  battleCreate(to = null) { return this.request('battle_create', to ? { to } : {}); }
  battleJoin(code) { return this.request('battle_join', { code }); }
  battleState(battleId) { return this.request('battle_state', { battleId }); }
  battleProgress(battleId, score, misses) { return this.request('battle_progress', { battleId, score, misses }); }
  battleCancel(battleId) { return this.request('battle_cancel', { battleId }); }
  simulList() { return this.request('simul_list'); }
  simulCreate(options) { return this.request('simul_create', options); }
  simulJoin(simulId) { return this.request('simul_join', { simulId }); }
  simulLeave(simulId) { return this.request('simul_leave', { simulId }); }
  simulStart(simulId, cancel = false) { return this.request('simul_start', cancel ? { simulId, cancel: true } : { simulId }); }
  simulState(simulId) { return this.request('simul_state', { simulId }); }
  vacation(options = {}) { return this.request('vacation', options); }
  playerOpenings(username) { return this.request('player_openings', { username }); }
  battleQueue() { return this.request('battle_queue'); }
  battleQueueStatus(leave = false) { return this.request('battle_queue_status', leave ? { leave: true } : {}); }
  battleLadder() { return this.request('battle_ladder'); }
  // Round 12: Vanta Bughouse, Twin Fates, club heraldry
  bughouseCreate(options) { return this.request('bughouse_create', options); }
  bughouseJoin(code, seat = null, name = undefined) { return this.request('bughouse_join', { code, ...(seat ? { seat } : {}), ...(name ? { name } : {}) }); }
  bughouseLeave(code) { return this.request('bughouse_leave', { code }); }
  bughouseState(code) { return this.request('bughouse_state', { code }); }
  bughouseForGame(gameId) { return this.request('bughouse_state', { gameId }); }
  fates() { return this.request('fates'); }
  twinCreate(options) { return this.request('twin_create', options); }
  twinState(twinId) { return this.request('twin_state', { twinId }); }
  clubCrest(slug, crest) { return this.request('club_crest', { slug, crest }); }
  commentaryPost(tournamentId, body, gameId = null) { return this.request('commentary_post', gameId ? { tournamentId, body, gameId } : { tournamentId, body }); }
  explorerBackfill() { return this.request('explorer_backfill'); }
  momentOfWeek() { return this.request('moment_of_week'); }
  momentPick(gameId, caption = '') { return this.request('moment_pick', gameId ? { gameId, caption } : {}); }
}

export function stableGuestToken(storage = localStorage) {
  const key = 'vanta.guest-token';
  let token = storage.getItem(key);
  if (!token || token.length < 20) {
    token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    storage.setItem(key, token);
  }
  return token;
}

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
      body: JSON.stringify({ action, ...(this.token ? { token: this.token } : {}), ...payload }),
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

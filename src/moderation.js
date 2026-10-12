// Chat moderation: the browser uses the same word lists, folding and mute ladder as the game
// server, so it can warn before sending. The server's verdict is the one that counts.
export * from '../supabase/functions/chess/moderation.js';

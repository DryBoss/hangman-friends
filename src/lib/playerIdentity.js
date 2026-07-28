// There's no login. A player is just a random id generated the moment
// someone hosts or joins a room, persisted in localStorage keyed by that
// room's code. Reloading the page in the same room reattaches to the same
// seat instead of creating a duplicate player.

const keyFor = (roomCode) => `hangman-friends-identity:${roomCode}`;

export function getOrCreatePlayerId(roomCode) {
  const key = keyFor(roomCode);
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    // localStorage unavailable (private browsing, etc.) - fall back to an
    // id that at least survives for the lifetime of this tab.
    return crypto.randomUUID();
  }
}

export function forgetPlayerId(roomCode) {
  try {
    window.localStorage.removeItem(keyFor(roomCode));
  } catch {
    // nothing to clean up
  }
}

export function generateRoomCode() {
  // Unambiguous character set - no 0/O or 1/I - so a code read aloud or
  // typed on a phone keyboard doesn't get miskeyed.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

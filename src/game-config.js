const ROOM_PATTERN = /^[A-Z0-9_-]{4,32}$/;

export function normalizeRoomId(value, fallback) {
  const candidate = String(value ?? '').trim().toUpperCase();
  return ROOM_PATTERN.test(candidate) ? candidate : fallback;
}

export function initialClocks(seconds) {
  const safeSeconds = Number.isInteger(seconds) && seconds > 0 ? seconds : 600;
  return { w: safeSeconds, b: safeSeconds };
}

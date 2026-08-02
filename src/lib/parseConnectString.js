// Handles both formats a scanned QR code might contain: the
// hangmanfriends://join?ip=...&port=... deep link LanHostActive generates,
// or (defensively, in case someone's QR reader normalizes/shortens it,
// or a future version of the host encodes something simpler) a bare
// "ip:port" string.
export function parseConnectString(rawValue) {
  const trimmed = rawValue.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol === "hangmanfriends:") {
      const ip = url.searchParams.get("ip") || url.hostname;
      const port = url.searchParams.get("port") || "8787";
      if (ip) return `${ip}:${port}`;
    }
  } catch {
    // not a URL at all - fall through and treat it as a plain ip:port
  }
  return trimmed;
}

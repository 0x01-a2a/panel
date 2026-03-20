/**
 * Shared session utilities used by both /api/auth and /api/proxy routes.
 *
 * SESSION_SECRET must be set in .env.local for production. Without it every
 * server restart invalidates all sessions (the fallback is a per-process random
 * value that is NOT shared across Next.js workers or restarts).
 */
import crypto from "crypto";

export const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

/** Session tokens expire after 7 days. */
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export function makeToken(user: string): string {
  const payload = `${user}:${Date.now()}`;
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64");
}

/**
 * Verify a session token.
 * Checks HMAC integrity AND that the token is not older than TOKEN_MAX_AGE_MS.
 */
export function verifySession(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    const hmac = parts.pop()!;
    // Second-to-last part is the timestamp (Unix ms).
    const ts = parseInt(parts[parts.length - 1], 10);
    if (isNaN(ts) || Date.now() - ts > TOKEN_MAX_AGE_MS) return false;
    const payload = parts.join(":");
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

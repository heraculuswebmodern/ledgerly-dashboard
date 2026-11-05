/**
 * Stateless, HMAC-signed session tokens built on Web Crypto, so the same code runs in
 * the proxy and in Route Handlers. Format: base64url(payload).base64url(signature).
 */

export const SESSION_COOKIE = "ledgerly_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  /** Session id, also the key of this visitor's sandboxed data store. */
  sid: string;
  /** User id. */
  uid: string;
  /** Expiry, seconds since epoch. */
  exp: number;
};

const DEV_FALLBACK_SECRET = "ledgerly-local-development-secret-change-me";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  // A demo must deploy with zero configuration, so we fall back to a built-in secret.
  // Set SESSION_SECRET in any environment that is not a throwaway demo.
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();
let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return keyPromise;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(
  token: string | undefined | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!token || token.length > 1024) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.sid !== "string" || typeof payload.uid !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface AppTokenPayload extends JWTPayload {
  sub: string;       // user id
  email: string;
  roles: string[];
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET env var is missing or too short (min 32 chars). Set it in .env"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT with the application payload.
 * TTL is in seconds; use a large value since the session cookie has no
 * max-age and will be cleared when the browser closes.
 */
export async function signToken(
  payload: Omit<AppTokenPayload, "iat" | "exp">,
  ttlSeconds: number
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(getSecret());
}

/**
 * Verifies a JWT and returns the payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(
  token: string
): Promise<AppTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as AppTokenPayload;
  } catch {
    return null;
  }
}

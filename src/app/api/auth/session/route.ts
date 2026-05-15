import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/backend/common/utils/jwt";

const SESSION_COOKIE = "zableke_session";
const LOGGED_IN_COOKIE = "zableke_logged_in";

/**
 * POST: Receives a JWT, validates it, and sets an HttpOnly session cookie.
 * Also sets a non-HttpOnly marker cookie so the frontend can detect login state.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  // Verify the token is valid before storing it as a session cookie
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ ok: true });

  // HttpOnly session cookie — not accessible from JavaScript (XSS protection)
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    // No maxAge → session cookie, cleared when browser closes
  });

  // Non-HttpOnly marker cookie — lets frontend detect login state
  response.cookies.set(LOGGED_IN_COOKIE, "1", {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

/**
 * DELETE: Clears the session and marker cookies (logout).
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(LOGGED_IN_COOKIE, "", {
    httpOnly: false,
    path: "/",
    maxAge: 0,
  });

  return response;
}

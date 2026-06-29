import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requestAdmin } from "@/backend/modules/drive/drive-auth";

function appOrigin(request: NextRequest): string {
  return (process.env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  if (!await requestAdmin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return Response.json({ error: "GOOGLE_CLIENT_ID is missing" }, { status: 500 });

  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${appOrigin(request)}/api/admin/drive/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: ["openid", "email", "https://www.googleapis.com/auth/drive"].join(" "),
    state,
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("zableke_drive_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
    maxAge: 600,
    path: "/",
  });
  return response;
}

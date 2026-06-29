import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requestAdmin } from "@/backend/modules/drive/drive-auth";
import { exchangeAuthorizationCode, getDriveAccount } from "@/backend/modules/drive/drive-client";
import { DriveService } from "@/backend/modules/drive/drive-service";

function appOrigin(request: NextRequest): string {
  return (process.env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const redirect = (result: string) =>
    NextResponse.redirect(`${appOrigin(request)}/admin/integraciones?drive=${result}`);
  if (!await requestAdmin(request)) return redirect("forbidden");

  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("zableke_drive_oauth_state")?.value;
  const code = request.nextUrl.searchParams.get("code");
  if (!state || !expectedState || state !== expectedState || !code) return redirect("invalid_state");

  try {
    const redirectUri = `${appOrigin(request)}/api/admin/drive/callback`;
    const tokens = await exchangeAuthorizationCode(code, redirectUri);
    const account = await getDriveAccount(tokens.access_token);
    await new DriveService().connectAccount({
      accountEmail: account.emailAddress,
      refreshToken: tokens.refresh_token,
    });
    const response = redirect("connected");
    response.cookies.delete("zableke_drive_oauth_state");
    return response;
  } catch (error) {
    console.error("Google Drive OAuth callback failed:", error);
    return redirect("error");
  }
}

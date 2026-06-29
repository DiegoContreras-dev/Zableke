const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
};

type DriveFile = {
  id: string;
  name: string;
  webViewLink?: string;
  driveId?: string;
  modifiedTime?: string;
};

function oauthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  }
  return { clientId, clientSecret };
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json()) as TokenResponse;
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || "Google OAuth failed");
  }
  return result;
}

export async function exchangeAuthorizationCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = oauthCredentials();
  return tokenRequest(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }));
}

export async function refreshDriveAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = oauthCredentials();
  const result = await tokenRequest(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }));
  return result.access_token;
}

async function driveRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Drive API (${response.status}): ${detail || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function getDriveAccount(accessToken: string) {
  const result = await driveRequest<{
    user: { emailAddress: string; displayName: string };
  }>(accessToken, "/about?fields=user(emailAddress,displayName)");
  return result.user;
}

export async function getDriveFile(accessToken: string, fileId: string): Promise<DriveFile> {
  return driveRequest<DriveFile>(
    accessToken,
    `/files/${encodeURIComponent(fileId)}?fields=id,name,webViewLink,driveId&supportsAllDrives=true`,
  );
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function findManagedFolder(
  accessToken: string,
  parentId: string,
  key: string,
  value: string,
): Promise<DriveFile | null> {
  const query = [
    `'${escapeQueryValue(parentId)}' in parents`,
    `mimeType='${FOLDER_MIME_TYPE}'`,
    "trashed=false",
    `appProperties has { key='${escapeQueryValue(key)}' and value='${escapeQueryValue(value)}' }`,
  ].join(" and ");
  const result = await driveRequest<{ files: DriveFile[] }>(
    accessToken,
    `/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  return result.files[0] ?? null;
}

export async function createManagedFolder(
  accessToken: string,
  params: {
    name: string;
    parentId: string;
    appProperties?: Record<string, string>;
  },
): Promise<DriveFile> {
  return driveRequest<DriveFile>(
    accessToken,
    "/files?fields=id,name,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        mimeType: FOLDER_MIME_TYPE,
        parents: [params.parentId],
        ...(params.appProperties ? { appProperties: params.appProperties } : {}),
      }),
    },
  );
}

export async function listDriveFolders(
  accessToken: string,
  parentId: string,
): Promise<DriveFile[]> {
  const query = [
    `'${escapeQueryValue(parentId)}' in parents`,
    `mimeType='${FOLDER_MIME_TYPE}'`,
    "trashed=false",
  ].join(" and ");
  const result = await driveRequest<{ files: DriveFile[] }>(
    accessToken,
    `/files?q=${encodeURIComponent(query)}&orderBy=name_natural&fields=files(id,name,webViewLink,driveId,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  return result.files;
}

export async function listSharedDrives(accessToken: string) {
  const result = await driveRequest<{ drives?: Array<{ id: string; name: string }> }>(
    accessToken,
    "/drives?pageSize=100&fields=drives(id,name)",
  );
  return result.drives ?? [];
}

export async function ensureUserWriterPermission(
  accessToken: string,
  fileId: string,
  email: string,
): Promise<void> {
  const permissions = await driveRequest<{
    permissions?: Array<{ id: string; emailAddress?: string; role: string }>;
  }>(
    accessToken,
    `/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,emailAddress,role)&supportsAllDrives=true`,
  );
  if (permissions.permissions?.some(
    (permission) => permission.emailAddress?.toLowerCase() === email.toLowerCase(),
  )) return;

  await driveRequest(
    accessToken,
    `/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=true&supportsAllDrives=true`,
    {
      method: "POST",
      body: JSON.stringify({ type: "user", role: "writer", emailAddress: email }),
    },
  );
}

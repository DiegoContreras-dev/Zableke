export function profileAvatarSrc(
  avatarUrl: string | null | undefined,
  userId: string | null | undefined,
  version?: number,
): string | null {
  if (!avatarUrl || !userId) return null;

  if (avatarUrl.startsWith("/api/profile/avatar")) {
    const params = new URLSearchParams({ userId });
    if (version) params.set("v", String(version));
    return `/api/profile/avatar?${params.toString()}`;
  }

  if (!version) return avatarUrl;
  const separator = avatarUrl.includes("?") ? "&" : "?";
  return `${avatarUrl}${separator}v=${version}`;
}

const SESSION_COOKIE_NAME = "zableke_session";

function buildCookieAttributes(): string {
  const attributes = ["Path=/", "SameSite=Lax"];
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:"
  ) {
    attributes.push("Secure");
  }
  // Sin Max-Age ni Expires → cookie de sesión, se borra al cerrar el navegador
  return attributes.join("; ");
}

export function createTutorSession(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; ${buildCookieAttributes()}`;
}

export function clearTutorSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

export function hasTutorSession(): boolean {
  return getSessionToken() !== null;
}

export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const pair = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!pair) return null;
  const value = pair.slice(SESSION_COOKIE_NAME.length + 1);
  return value.length > 0 ? decodeURIComponent(value) : null;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

/**
 * Reads the `roles` claim out of a JWT without verifying its signature.
 * Only for client-side UI routing/UX; the real authorization boundary is
 * the signature-verified check in the GraphQL context/resolvers.
 */
export function decodeRolesFromToken(token: string): string[] {
  const parts = token.split(".");
  if (parts.length !== 3) return [];
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { roles?: unknown };
    return Array.isArray(payload.roles)
      ? payload.roles.filter((role): role is string => typeof role === "string")
      : [];
  } catch {
    return [];
  }
}

export function getSessionRoles(): string[] {
  const token = getSessionToken();
  return token ? decodeRolesFromToken(token) : [];
}

/**
 * Decides where a dashboard shell should redirect a user whose roles don't
 * include the role required by that shell. Dual-role users get sent to the
 * shell they *do* have access to instead of being bounced to /login.
 */
export function resolveRequiredRoleRedirect(
  roles: string[],
  requiredRole: "ADMIN" | "TUTOR",
): string | null {
  if (roles.includes(requiredRole)) return null;
  if (requiredRole === "ADMIN" && roles.includes("TUTOR")) return "/tutor";
  if (requiredRole === "TUTOR" && roles.includes("ADMIN")) return "/admin";
  return "/login";
}

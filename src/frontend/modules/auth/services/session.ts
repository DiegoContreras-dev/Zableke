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

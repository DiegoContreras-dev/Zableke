const SESSION_COOKIE_NAME = "zableke_tutor_session";
const SESSION_COOKIE_VALUE = "active";
const REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function buildCookieAttributes(maxAgeSeconds?: number): string {
  const attributes = ["Path=/", "SameSite=Lax"];

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:"
  ) {
    attributes.push("Secure");
  }

  if (typeof maxAgeSeconds === "number") {
    attributes.push(`Max-Age=${maxAgeSeconds}`);
  }

  return attributes.join("; ");
}

export function createTutorSession(rememberMe: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  const maxAgeSeconds = rememberMe ? REMEMBER_ME_MAX_AGE_SECONDS : undefined;
  document.cookie = `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}; ${buildCookieAttributes(maxAgeSeconds)}`;
}

export function clearTutorSession(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=; ${buildCookieAttributes(0)}`;
}

export function hasTutorSession(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .some(
      (cookie) =>
        cookie.trim() === `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}`,
    );
}

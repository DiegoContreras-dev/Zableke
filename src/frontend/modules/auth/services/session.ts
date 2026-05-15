const LOGGED_IN_COOKIE = "zableke_logged_in";

/**
 * Creates a session by sending the JWT to the server, which stores it
 * in an HttpOnly cookie (inaccessible to JavaScript / XSS attacks).
 */
export async function createTutorSession(token: string): Promise<void> {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    credentials: "same-origin",
  });
}

/**
 * Clears the session by asking the server to delete the HttpOnly cookie.
 */
export async function clearTutorSession(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
  });
}

/**
 * Checks if the user appears to be logged in by reading the
 * non-HttpOnly marker cookie (the actual JWT is HttpOnly and
 * cannot be read from JavaScript).
 */
export function hasTutorSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${LOGGED_IN_COOKIE}=1`);
}

/**
 * @deprecated Token is now stored in an HttpOnly cookie and sent
 * automatically by the browser. This function is kept for backward
 * compatibility but always returns null.
 */
export function getSessionToken(): string | null {
  return null;
}

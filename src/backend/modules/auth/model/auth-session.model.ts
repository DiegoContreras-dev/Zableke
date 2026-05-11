export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
}

export interface AuthSession {
  user: AuthenticatedUser;
  /** Signed JWT — el frontend lo almacena en una cookie de sesión */
  token: string;
  issuedAt: string;
  expiresAt: string;
}

export function buildAuthSession(
  user: AuthenticatedUser,
  token: string,
  ttlSeconds: number
): AuthSession {
  const issuedAtDate = new Date();
  const expiresAtDate = new Date(issuedAtDate.getTime() + ttlSeconds * 1000);
  return {
    user,
    token,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
  };
}

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
  issuedAt: string;
  expiresAt: string;
}

export function buildAuthSession(user: AuthenticatedUser, ttlMinutes: number): AuthSession {
  const issuedAtDate = new Date();
  const expiresAtDate = new Date(issuedAtDate.getTime() + ttlMinutes * 60 * 1000);

  return {
    user,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString(),
  };
}

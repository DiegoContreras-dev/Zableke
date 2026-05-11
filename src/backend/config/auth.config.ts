/**
 * Dominio → Rol asignado automáticamente al primer login.
 * - alumnos.ucn.cl → TUTOR
 * - ce.ucn.cl      → ADMIN
 */
export const DOMAIN_ROLE_MAP: Record<string, string> = {
  "alumnos.ucn.cl": "TUTOR",
  "ce.ucn.cl": "ADMIN",
};

const DEFAULT_ALLOWED_DOMAINS = Object.keys(DOMAIN_ROLE_MAP);

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function parseAllowedDomains(value?: string): string[] {
  if (!value) {
    return DEFAULT_ALLOWED_DOMAINS;
  }

  const domains = value
    .split(",")
    .map((item) => normalizeDomain(item))
    .filter(Boolean);

  return domains.length > 0 ? domains : DEFAULT_ALLOWED_DOMAINS;
}

// TTL del JWT: 400 días en segundos (la cookie de sesión se borra al
// cerrar el navegador; el JWT actúa como techo de expiración máxima).
const DEFAULT_JWT_TTL_SECONDS = 400 * 24 * 60 * 60;

export const authConfig = {
  allowedDomains: parseAllowedDomains(process.env.AUTH_ALLOWED_DOMAINS),
  /** @deprecated Usar jwtTtlSeconds */
  sessionTtlMinutes: Number(process.env.AUTH_SESSION_TTL_MINUTES ?? 60),
  jwtTtlSeconds: Number(process.env.AUTH_JWT_TTL_SECONDS ?? DEFAULT_JWT_TTL_SECONDS),
};

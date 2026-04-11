const DEFAULT_ALLOWED_DOMAINS = ["alumnos.ucn.cl", "ucn.cl"];

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

export const authConfig = {
  allowedDomains: parseAllowedDomains(process.env.AUTH_ALLOWED_DOMAINS),
  sessionTtlMinutes: Number(process.env.AUTH_SESSION_TTL_MINUTES ?? 60),
};

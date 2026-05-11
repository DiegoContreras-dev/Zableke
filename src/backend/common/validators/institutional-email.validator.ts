export interface InstitutionalEmailValidationResult {
  ok: boolean;
  normalizedEmail: string;
  domain: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string): string | null {
  const atIndex = email.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return null;
  }

  return email.slice(atIndex + 1);
}

export function validateInstitutionalEmail(
  email: string,
  allowedDomains: string[]
): InstitutionalEmailValidationResult {
  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return { ok: false, normalizedEmail, domain: null };
  }

  const domain = getEmailDomain(normalizedEmail);
  if (!domain) {
    return { ok: false, normalizedEmail, domain: null };
  }

  const isAllowed = allowedDomains
    .map((item) => item.toLowerCase())
    .includes(domain.toLowerCase());

  return {
    ok: isAllowed,
    normalizedEmail,
    domain,
  };
}

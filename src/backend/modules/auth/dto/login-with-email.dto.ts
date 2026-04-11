import { AuthError } from "@/backend/common/errors/auth.error";

export interface LoginWithEmailInput {
  email: string;
  firstName?: string;
  lastName?: string;
}

function asOptionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseLoginWithEmailInput(raw: unknown): LoginWithEmailInput {
  if (!raw || typeof raw !== "object") {
    throw new AuthError("Invalid login input", "INVALID_INPUT", 400);
  }

  const candidate = raw as Record<string, unknown>;
  const email = asOptionalTrimmedString(candidate.email);

  if (!email) {
    throw new AuthError("Email is required", "INVALID_INPUT", 400);
  }

  return {
    email,
    firstName: asOptionalTrimmedString(candidate.firstName),
    lastName: asOptionalTrimmedString(candidate.lastName),
  };
}

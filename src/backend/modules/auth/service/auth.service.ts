import { AuthError } from "@/backend/common/errors/auth.error";
import { validateInstitutionalEmail } from "@/backend/common/validators/institutional-email.validator";
import { authConfig } from "@/backend/config/auth.config";
import {
  parseLoginWithEmailInput,
  type LoginWithEmailInput,
} from "@/backend/modules/auth/dto/login-with-email.dto";
import {
  buildAuthSession,
  type AuthenticatedUser,
  type AuthSession,
} from "@/backend/modules/auth/model/auth-session.model";
import {
  AuthRepository,
  type AuthUserRecord,
} from "@/backend/modules/auth/repository/auth.repository";


function deriveNameFromEmail(email: string): { firstName: string; lastName: string } {
  const localPart = email.split("@")[0] ?? "usuario";
  const [first, second] = localPart.split(/[._-]+/);

  const firstName = first && first.length > 0 ? first : "Usuario";
  const lastName = second && second.length > 0 ? second : "UCN";

  return {
    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
    lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
  };
}

function deriveNameFromRecord(record: AuthUserRecord): { firstName: string; lastName: string } {
  if (record.firstName && record.lastName) {
    return {
      firstName: record.firstName,
      lastName: record.lastName,
    };
  }

  return {
    firstName: "Usuario",
    lastName: "UCN",
  };
}

function toAuthenticatedUser(record: AuthUserRecord): AuthenticatedUser {
  const name = deriveNameFromRecord(record);

  return {
    id: record.id,
    email: record.email,
    firstName: name.firstName,
    lastName: name.lastName,
    isActive: record.isActive,
    roles: record.roles.map((item) => item.role.name),
  };
}

export class AuthService {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly allowedDomains = authConfig.allowedDomains,
    private readonly sessionTtlMinutes = authConfig.sessionTtlMinutes
  ) {}

  async authenticate(rawInput: unknown): Promise<AuthSession> {
    const input: LoginWithEmailInput = parseLoginWithEmailInput(rawInput);
    const validation = validateInstitutionalEmail(input.email, this.allowedDomains);

    if (!validation.ok) {
      throw new AuthError(
        "Only institutional email domains are allowed",
        "EMAIL_NOT_ALLOWED",
        403
      );
    }

    let user = await this.repository.findByEmail(validation.normalizedEmail);

    if (!user) {
      const inferredName = deriveNameFromEmail(validation.normalizedEmail);
      user = await this.repository.create({
        email: validation.normalizedEmail,
        firstName: input.firstName ?? inferredName.firstName,
        lastName: input.lastName ?? inferredName.lastName,
      });
    }

    if (!user.isActive) {
      throw new AuthError("User is inactive", "USER_INACTIVE", 403);
    }

    return buildAuthSession(toAuthenticatedUser(user), this.sessionTtlMinutes);
  }
}

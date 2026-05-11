import { AuthError } from "@/backend/common/errors/auth.error";
import { signToken } from "@/backend/common/utils/jwt";
import { validateInstitutionalEmail } from "@/backend/common/validators/institutional-email.validator";
import { authConfig, DOMAIN_ROLE_MAP } from "@/backend/config/auth.config";
import bcrypt from "bcryptjs";
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

function getRoleForDomain(email: string): string | undefined {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DOMAIN_ROLE_MAP[domain] : undefined;
}

export class AuthService {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly allowedDomains = authConfig.allowedDomains,
    private readonly jwtTtlSeconds = authConfig.jwtTtlSeconds
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

    const domain = validation.normalizedEmail.split("@")[1]?.toLowerCase();
    const isAdminDomain = domain === "ce.ucn.cl";

    if (isAdminDomain) {
      // Las cuentas admin deben estar pre-seeded con contraseña; no se auto-crean
      if (!user) {
        throw new AuthError(
          "Admin account not found. Contact system administrator.",
          "USER_NOT_FOUND",
          404
        );
      }
      if (!input.password) {
        throw new AuthError(
          "Password is required for admin accounts",
          "INVALID_INPUT",
          400
        );
      }
      if (!user.passwordHash) {
        throw new AuthError(
          "Admin account is not properly configured",
          "INVALID_CREDENTIALS",
          403
        );
      }
      const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
      if (!passwordMatch) {
        throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS", 401);
      }
    } else if (!user) {
      const inferredName = deriveNameFromEmail(validation.normalizedEmail);
      const roleName = getRoleForDomain(validation.normalizedEmail);
      user = await this.repository.create({
        email: validation.normalizedEmail,
        firstName: input.firstName ?? inferredName.firstName,
        lastName: input.lastName ?? inferredName.lastName,
        roleName,
      });
    }

    if (!user.isActive) {
      throw new AuthError("User is inactive", "USER_INACTIVE", 403);
    }

    const authenticatedUser = toAuthenticatedUser(user);
    const token = await signToken(
      {
        sub: authenticatedUser.id,
        email: authenticatedUser.email,
        roles: authenticatedUser.roles,
      },
      this.jwtTtlSeconds
    );
    return buildAuthSession(authenticatedUser, token, this.jwtTtlSeconds);
  }

  async authenticateWithGoogle(idToken: string): Promise<AuthSession> {
    if (!idToken || typeof idToken !== "string") {
      throw new AuthError("ID token is required", "INVALID_GOOGLE_TOKEN", 400);
    }

    // Verificar el token con Google
    const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    let googlePayload: Record<string, string>;

    try {
      const res = await fetch(tokenInfoUrl);
      if (!res.ok) {
        throw new AuthError("Invalid or expired Google token", "INVALID_GOOGLE_TOKEN", 401);
      }
      googlePayload = (await res.json()) as Record<string, string>;
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Failed to verify Google token", "GOOGLE_VERIFY_ERROR", 500);
    }

    // Verificar audience (aud debe coincidir con nuestro Client ID)
    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    if (!expectedAud || googlePayload["aud"] !== expectedAud) {
      throw new AuthError("Token audience mismatch", "INVALID_TOKEN_AUD", 401);
    }

    // Verificar que el email esté verificado
    if (googlePayload["email_verified"] !== "true") {
      throw new AuthError("Google email is not verified", "EMAIL_NOT_VERIFIED", 401);
    }

    const email = (googlePayload["email"] ?? "").toLowerCase().trim();
    if (!email) {
      throw new AuthError("Email not found in Google token", "EMAIL_MISSING", 401);
    }

    // Validar dominio institucional
    const validation = validateInstitutionalEmail(email, this.allowedDomains);
    if (!validation.ok) {
      throw new AuthError(
        "Only institutional email domains are allowed (@alumnos.ucn.cl or @ce.ucn.cl)",
        "EMAIL_NOT_ALLOWED",
        403
      );
    }

    let user = await this.repository.findByEmail(validation.normalizedEmail);

    if (!user) {
      const firstName = (googlePayload["given_name"] ?? "").trim() || deriveNameFromEmail(validation.normalizedEmail).firstName;
      const lastName = (googlePayload["family_name"] ?? "").trim() || deriveNameFromEmail(validation.normalizedEmail).lastName;
      const roleName = getRoleForDomain(validation.normalizedEmail);
      user = await this.repository.create({
        email: validation.normalizedEmail,
        firstName,
        lastName,
        roleName,
      });
    }

    if (!user.isActive) {
      throw new AuthError("User is inactive", "USER_INACTIVE", 403);
    }

    const authenticatedUser = toAuthenticatedUser(user);
    const token = await signToken(
      {
        sub: authenticatedUser.id,
        email: authenticatedUser.email,
        roles: authenticatedUser.roles,
      },
      this.jwtTtlSeconds
    );
    return buildAuthSession(authenticatedUser, token, this.jwtTtlSeconds);
  }
}

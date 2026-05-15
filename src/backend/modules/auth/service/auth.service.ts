import { AuthError } from "@/backend/common/errors/auth.error";
import { signToken } from "@/backend/common/utils/jwt";
import { validateInstitutionalEmail } from "@/backend/common/validators/institutional-email.validator";
import { authConfig, DOMAIN_ROLE_MAP } from "@/backend/config/auth.config";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, jwtVerify } from "jose";

/** Google's public JWKS for local ID-token signature verification */
const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);
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

  /**
   * Email/password authentication — restricted to admin domain (ce.ucn.cl).
   * Non-admin users MUST use Google OAuth to prevent email-only account takeover.
   */
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

    // SECURITY: Only admin domain can use email/password login.
    // Non-admin users must use Google OAuth to prove email ownership.
    const domain = validation.normalizedEmail.split("@")[1]?.toLowerCase();
    if (domain !== "ce.ucn.cl") {
      throw new AuthError(
        "Email/password login is only available for admin accounts. Use Google OAuth.",
        "EMAIL_NOT_ALLOWED",
        403
      );
    }

    const user = await this.repository.findByEmail(validation.normalizedEmail);

    // Admin accounts must be pre-seeded with password; never auto-created.
    // Use a single generic error to prevent account enumeration.
    if (!user || !input.password || !user.passwordHash) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS", 401);
    }
    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AuthError("Invalid credentials", "INVALID_CREDENTIALS", 401);
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

  /**
   * Google OAuth authentication — verifies ID token locally via JWKS.
   * Auto-creates non-admin accounts only; admin accounts must be pre-provisioned.
   */
  async authenticateWithGoogle(idToken: string): Promise<AuthSession> {
    if (!idToken || typeof idToken !== "string") {
      throw new AuthError("ID token is required", "INVALID_GOOGLE_TOKEN", 400);
    }

    const expectedAud = process.env.GOOGLE_CLIENT_ID;
    if (!expectedAud) {
      throw new AuthError("Google Client ID not configured", "INVALID_STATE", 500);
    }

    // SECURITY: Verify token signature locally using Google's public JWKS keys
    // instead of the tokeninfo debug endpoint (more secure, no SSRF risk).
    let googlePayload: Record<string, unknown>;
    try {
      const { payload } = await jwtVerify(idToken, googleJwks, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: expectedAud,
      });
      googlePayload = payload as Record<string, unknown>;
    } catch {
      throw new AuthError("Invalid or expired Google token", "INVALID_GOOGLE_TOKEN", 401);
    }

    // Verify email is verified
    if (googlePayload["email_verified"] !== true) {
      throw new AuthError("Google email is not verified", "EMAIL_NOT_VERIFIED", 401);
    }

    const email = String(googlePayload["email"] ?? "").toLowerCase().trim();
    if (!email) {
      throw new AuthError("Email not found in Google token", "EMAIL_MISSING", 401);
    }

    let user = await this.repository.findByEmail(email);

    if (!user) {
      const validation = validateInstitutionalEmail(email, this.allowedDomains);
      if (!validation.ok) {
        throw new AuthError(
          "Only pre-authorized or institutional email domains are allowed",
          "EMAIL_NOT_ALLOWED",
          403
        );
      }

      // SECURITY: Block auto-creation for admin domains.
      // Admin accounts must be pre-provisioned in the database.
      const emailDomain = validation.normalizedEmail.split("@")[1]?.toLowerCase();
      if (emailDomain === "ce.ucn.cl") {
        throw new AuthError(
          "Admin accounts must be pre-provisioned. Contact system administrator.",
          "EMAIL_NOT_ALLOWED",
          403
        );
      }

      const firstName = String(googlePayload["given_name"] ?? "").trim() || deriveNameFromEmail(validation.normalizedEmail).firstName;
      const lastName = String(googlePayload["family_name"] ?? "").trim() || deriveNameFromEmail(validation.normalizedEmail).lastName;
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

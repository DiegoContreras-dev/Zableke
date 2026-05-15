import { AuthError } from "@/backend/common/errors/auth.error";
import { prisma } from "@/infrastructure/prisma/client";
import {
  UsersRepository,
  type UserRecord,
  type UpdateProfileInput,
} from "@/backend/modules/users/repository/users.repository";

export interface UserProfileView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  roles: string[];
  isActive: boolean;
}

function toView(record: UserRecord): UserProfileView {
  return {
    id: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    phone: record.phone ?? null,
    bio: record.bio ?? null,
    linkedinUrl: record.linkedinUrl ?? null,
    roles: record.roles.map((ur) => ur.role.name),
    isActive: record.isActive,
  };
}

function validateProfileInput(input: unknown): UpdateProfileInput {
  if (!input || typeof input !== "object") {
    throw new AuthError("Invalid input", "INVALID_INPUT", 400);
  }
  const obj = input as Record<string, unknown>;
  const result: UpdateProfileInput = {};

  if (obj.firstName !== undefined) {
    if (typeof obj.firstName !== "string" || obj.firstName.trim().length === 0) {
      throw new AuthError("firstName must be a non-empty string", "INVALID_INPUT", 400);
    }
    result.firstName = obj.firstName.trim();
  }
  if (obj.lastName !== undefined) {
    if (typeof obj.lastName !== "string" || obj.lastName.trim().length === 0) {
      throw new AuthError("lastName must be a non-empty string", "INVALID_INPUT", 400);
    }
    result.lastName = obj.lastName.trim();
  }
  if (obj.phone !== undefined) {
    if (obj.phone !== null && typeof obj.phone !== "string") {
      throw new AuthError("phone must be a string or null", "INVALID_INPUT", 400);
    }
    result.phone = (obj.phone as string | null) ?? undefined;
  }
  if (obj.bio !== undefined) {
    if (obj.bio !== null && typeof obj.bio !== "string") {
      throw new AuthError("bio must be a string or null", "INVALID_INPUT", 400);
    }
    const bio = obj.bio as string | null;
    if (bio && bio.length > 500) {
      throw new AuthError("bio must be at most 500 characters", "INVALID_INPUT", 400);
    }
    result.bio = bio ?? undefined;
  }
  if (obj.linkedinUrl !== undefined) {
    if (obj.linkedinUrl !== null && typeof obj.linkedinUrl !== "string") {
      throw new AuthError("linkedinUrl must be a string or null", "INVALID_INPUT", 400);
    }
    result.linkedinUrl = (obj.linkedinUrl as string | null) ?? undefined;
  }

  return result;
}

export class UsersService {
  constructor(private readonly repo = new UsersRepository()) {}

  async getMe(userId: string): Promise<UserProfileView> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AuthError("User not found", "USER_NOT_FOUND", 404);
    }
    return toView(user);
  }

  async updateMyProfile(userId: string, rawInput: unknown): Promise<UserProfileView> {
    const input = validateProfileInput(rawInput);
    const updated = await this.repo.updateProfile(userId, input);
    return toView(updated);
  }

  async deleteUser(targetId: string): Promise<boolean> {
    const user = await this.repo.findById(targetId);
    if (!user) {
      throw new AuthError("User not found", "USER_NOT_FOUND", 404);
    }
    await this.repo.deleteById(targetId);
    return true;
  }

  async adminUpdateUser(id: string, rawInput: unknown): Promise<UserProfileView> {
    if (!rawInput || typeof rawInput !== "object") {
      throw new AuthError("Input inválido", "INVALID_INPUT", 400);
    }
    const obj = rawInput as Record<string, unknown>;
    const data: { firstName?: string; lastName?: string; phone?: string | null; career?: string | null } = {};
    if (obj.firstName !== undefined) {
      if (typeof obj.firstName !== "string" || !obj.firstName.trim()) throw new AuthError("firstName inválido", "INVALID_INPUT", 400);
      data.firstName = obj.firstName.trim();
    }
    if (obj.lastName !== undefined) {
      if (typeof obj.lastName !== "string" || !obj.lastName.trim()) throw new AuthError("lastName inválido", "INVALID_INPUT", 400);
      data.lastName = obj.lastName.trim();
    }
    if (obj.phone !== undefined) {
      data.phone = obj.phone === null || obj.phone === "" ? null : String(obj.phone).trim();
    }
    if (obj.career !== undefined) {
      data.career = obj.career === null || obj.career === "" ? null : String(obj.career).trim();
    }
    const updated = await this.repo.adminUpdateUser(id, data);
    return toView(updated);
  }

  async createTutor(rawInput: unknown): Promise<UserProfileView> {
    if (!rawInput || typeof rawInput !== "object") {
      throw new AuthError("Input inválido", "INVALID_INPUT", 400);
    }
    const input = rawInput as Record<string, unknown>;

    const firstName = (typeof input.firstName === "string" ? input.firstName.trim() : "");
    const lastName = (typeof input.lastName === "string" ? input.lastName.trim() : "");
    const rut = (typeof input.rut === "string" ? input.rut.trim() : "");
    const email = (typeof input.email === "string" ? input.email.trim().toLowerCase() : "");
    const career = (typeof input.career === "string" ? input.career.trim() : "");
    const entryYear = (typeof input.entryYear === "number" ? input.entryYear : parseInt(String(input.entryYear), 10));

    if (!firstName || !lastName || !rut || !email || !career || isNaN(entryYear)) {
      throw new AuthError("Todos los campos son obligatorios", "INVALID_INPUT", 400);
    }

    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new AuthError("Ya existe un usuario con ese correo", "DUPLICATE_EMAIL", 409);
    }

    const tutorRole = await prisma.role.findUnique({ where: { name: "TUTOR" } });
    if (!tutorRole) {
      throw new AuthError("Rol TUTOR no encontrado en la base de datos", "RESOURCE_NOT_FOUND", 500);
    }

    const created = await this.repo.createTutorUser({
      firstName,
      lastName,
      rut,
      email,
      career,
      entryYear,
      tutorRoleId: tutorRole.id,
    });

    return toView(created);
  }
}

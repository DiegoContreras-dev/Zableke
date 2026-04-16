import { AuthError } from "@/backend/common/errors/auth.error";
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
}

export type AuthErrorCode =
  | "INVALID_INPUT"
  | "EMAIL_NOT_ALLOWED"
  | "USER_INACTIVE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND";

export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly statusCode: number;

  constructor(message: string, code: AuthErrorCode, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

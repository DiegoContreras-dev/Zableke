export type AuthErrorCode =
  | "INVALID_INPUT"
  | "EMAIL_NOT_ALLOWED"
  | "USER_INACTIVE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "TUTOR_SCHEDULE_CONFLICT"
  | "ROOM_SCHEDULE_CONFLICT"
  | "INVALID_STATE"
  | "INVALID_GOOGLE_TOKEN"
  | "GOOGLE_VERIFY_ERROR"
  | "INVALID_TOKEN_AUD"
  | "EMAIL_NOT_VERIFIED"
  | "EMAIL_MISSING"
  | "USER_NOT_FOUND"
  | "INVALID_CREDENTIALS";

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

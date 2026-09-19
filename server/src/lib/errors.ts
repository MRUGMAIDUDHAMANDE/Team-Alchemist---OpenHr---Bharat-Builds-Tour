/**
 * Application error model.
 *
 * Every failure surfaced to a client has a stable machine-readable `code`, an
 * HTTP status, and a human-readable `message`. Business code should throw
 * `AppError` (or a helper below) rather than returning ad-hoc error shapes.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  // Auth-specific codes
  | "INVALID_CREDENTIALS"
  | "USER_NOT_CONFIRMED"
  | "USER_ALREADY_EXISTS"
  | "USER_NOT_FOUND"
  | "CODE_MISMATCH"
  | "CODE_EXPIRED"
  | "PASSWORD_POLICY"
  | "TOO_MANY_ATTEMPTS"
  | "INVALID_REFRESH_TOKEN"
  | "ACCOUNT_DISABLED";

export interface AppErrorOptions {
  code: ErrorCode;
  status: number;
  message: string;
  /** Safe, structured details (e.g. field-level validation errors). */
  details?: unknown;
  /** Underlying error, logged but never sent to the client. */
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.cause = options.cause;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError({ code: "VALIDATION_ERROR", status: 400, message, details });
  }

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError({ code: "UNAUTHORIZED", status: 401, message });
  }

  static forbidden(message = "You are not allowed to perform this action"): AppError {
    return new AppError({ code: "FORBIDDEN", status: 403, message });
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError({ code: "NOT_FOUND", status: 404, message });
  }

  static conflict(message: string, code: ErrorCode = "CONFLICT"): AppError {
    return new AppError({ code, status: 409, message });
  }

  static internal(message = "Something went wrong", cause?: unknown): AppError {
    return new AppError({ code: "INTERNAL_ERROR", status: 500, message, cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

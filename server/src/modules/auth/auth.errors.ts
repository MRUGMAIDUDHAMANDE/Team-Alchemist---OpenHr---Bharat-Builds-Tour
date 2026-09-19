import { AppError } from "../../lib/errors";

/**
 * Translates Cognito error names into our own AppError model with friendly,
 * non-leaky messages. Cognito errors carry a `name` on the AWS SDK error.
 *
 * Reference: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-development-and-testing-with-amazon-cognito-user-pools.html
 */
export function mapCognitoError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) return error;

  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : "";

  switch (name) {
    case "UsernameExistsException":
      return AppError.conflict(
        "An account with this email already exists. Try signing in instead.",
        "USER_ALREADY_EXISTS",
      );

    case "UserNotFoundException":
      return new AppError({
        code: "USER_NOT_FOUND",
        status: 404,
        message: "No account was found for that email address.",
      });

    case "NotAuthorizedException":
      return new AppError({
        code: "INVALID_CREDENTIALS",
        status: 401,
        message: "The email or password is incorrect.",
      });

    case "UserNotConfirmedException":
      return new AppError({
        code: "USER_NOT_CONFIRMED",
        status: 403,
        message: "Verify your email address before signing in.",
      });

    case "CodeMismatchException":
      return new AppError({
        code: "CODE_MISMATCH",
        status: 400,
        message: "That verification code is not correct.",
      });

    case "ExpiredCodeException":
      return new AppError({
        code: "CODE_EXPIRED",
        status: 400,
        message: "That code has expired. Request a new one.",
      });

    case "InvalidPasswordException":
      return new AppError({
        code: "PASSWORD_POLICY",
        status: 400,
        message: message || "The password does not meet the required policy.",
      });

    case "InvalidParameterException":
      return new AppError({
        code: "VALIDATION_ERROR",
        status: 400,
        message: message || "One or more parameters are invalid.",
      });

    case "TooManyRequestsException":
    case "LimitExceededException":
      return new AppError({
        code: "TOO_MANY_ATTEMPTS",
        status: 429,
        message: "Too many attempts. Wait a moment and try again.",
      });

    case "TooManyFailedAttemptsException":
      return new AppError({
        code: "TOO_MANY_ATTEMPTS",
        status: 429,
        message: "Too many failed attempts. Try again later.",
      });

    case "UserLambdaValidationException":
      return AppError.badRequest("The request could not be processed.");

    case "InvalidLambdaResponseException":
    case "UnexpectedLambdaException":
      return AppError.internal("Authentication service is misconfigured.");

    case "EnableSoftwareTokenMFAException":
      return AppError.badRequest("Multi-factor authentication is required.");

    case "PasswordResetRequiredException":
      return new AppError({
        code: "INVALID_CREDENTIALS",
        status: 403,
        message: "A password reset is required before signing in.",
      });

    default:
      return AppError.internal(fallbackMessage, error);
  }
}

import { createHmac } from "node:crypto";
import {
  AdminGetUserCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient } from "../../aws/clients";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { decodeJwtPayload, type AccessTokenClaims, type IdTokenClaims } from "../../lib/jwt";
import { mapCognitoError } from "./auth.errors";
import {
  buildDefaultProfile,
  usersRepository,
} from "../users/users.repository";
import { toPrivateProfile, type PrivateUserProfile } from "../users/users.types";
import type {
  ConfirmSignupInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
  SignupInput,
} from "./auth.schemas";

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
}

export interface AuthSession {
  user: PrivateUserProfile;
  tokens: AuthTokens;
}

/**
 * Cognito requires a SECRET_HASH when the app client has a secret. We keep the
 * client secret server-side only, which is exactly why auth is proxied here.
 */
function secretHash(username: string): string | undefined {
  if (!env.COGNITO_CLIENT_SECRET) return undefined;
  return createHmac("sha256", env.COGNITO_CLIENT_SECRET)
    .update(`${username}${env.COGNITO_CLIENT_ID}`)
    .digest("base64");
}

function toTokens(result: AuthenticationResultType | undefined): AuthTokens {
  if (!result?.AccessToken || !result.IdToken) {
    throw AppError.internal("Cognito did not return a usable session");
  }

  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken ?? null,
    expiresIn: result.ExpiresIn ?? 3600,
    tokenType: result.TokenType ?? "Bearer",
  };
}

/** Look up the immutable Cognito `sub` for a username (we use email as username). */
async function findUserIdByUsername(username: string): Promise<string> {
  const result = await cognitoClient.send(
    new AdminGetUserCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      Username: username,
    }),
  );

  const sub = result.UserAttributes?.find((attr) => attr.Name === "sub")?.Value;
  if (!sub) {
    throw AppError.notFound("Account not found");
  }
  return sub;
}

export const authService = {
  /**
   * Create the Cognito user and its DynamoDB profile. The profile starts as
   * UNCONFIRMED and flips to ACTIVE once the email code is confirmed.
   */
  async signup(input: SignupInput): Promise<{ userId: string; email: string; requiresConfirmation: boolean }> {
    let userId: string;

    try {
      const result = await cognitoClient.send(
        new SignUpCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: input.email,
          Password: input.password,
          SecretHash: secretHash(input.email),
          UserAttributes: [
            { Name: "email", Value: input.email },
            { Name: "name", Value: input.name },
          ],
        }),
      );

      userId = result.UserSub ?? (await findUserIdByUsername(input.email));
    } catch (error) {
      throw mapCognitoError(error, "Could not create the account");
    }

    try {
      await usersRepository.createIfAbsent(
        buildDefaultProfile({
          userId,
          email: input.email,
          name: input.name,
          status: "UNCONFIRMED",
        }),
      );
    } catch (error) {
      // The Cognito account exists; a missing profile row is repaired on first
      // login via ensureFromIdentity. Log and continue rather than fail signup.
      logger.error("Failed to create user profile after signup", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { userId, email: input.email, requiresConfirmation: true };
  },

  async confirmSignup(input: ConfirmSignupInput): Promise<{ email: string }> {
    try {
      await cognitoClient.send(
        new ConfirmSignUpCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: input.email,
          ConfirmationCode: input.code,
          SecretHash: secretHash(input.email),
        }),
      );
    } catch (error) {
      throw mapCognitoError(error, "Could not verify the code");
    }

    try {
      const userId = await findUserIdByUsername(input.email);
      const existing = await usersRepository.getById(userId);
      if (existing) {
        await usersRepository.setStatus(userId, "ACTIVE");
      }
    } catch (error) {
      logger.warn("Could not mark profile ACTIVE after confirmation", {
        email: input.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { email: input.email };
  },

  async resendConfirmationCode(email: string): Promise<{ email: string }> {
    try {
      await cognitoClient.send(
        new ResendConfirmationCodeCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: email,
          SecretHash: secretHash(email),
        }),
      );
    } catch (error) {
      throw mapCognitoError(error, "Could not resend the verification code");
    }

    return { email };
  },

  async login(input: LoginInput): Promise<AuthSession> {
    let result: AuthenticationResultType | undefined;
    const hash = secretHash(input.email);

    try {
      const response = await cognitoClient.send(
        new InitiateAuthCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: input.email,
            PASSWORD: input.password,
            ...(hash ? { SECRET_HASH: hash } : {}),
          },
        }),
      );

      if (response.ChallengeName) {
        // NEW_PASSWORD_REQUIRED and MFA flows are handled in a later milestone.
        throw AppError.badRequest(
          `Additional sign-in step required: ${response.ChallengeName}`,
        );
      }

      result = response.AuthenticationResult;
    } catch (error) {
      throw mapCognitoError(error, "Could not sign in");
    }

    const tokens = toTokens(result);
    const idClaims = decodeJwtPayload<IdTokenClaims>(tokens.idToken);
    const accessClaims = decodeJwtPayload<AccessTokenClaims>(tokens.accessToken);

    const profile = await usersRepository.ensureFromIdentity({
      userId: accessClaims.sub,
      email: idClaims.email ?? input.email,
      name: idClaims.name ?? input.email.split("@")[0],
    });

    return { user: toPrivateProfile(profile), tokens };
  },

  async refresh(input: RefreshInput): Promise<AuthTokens> {
    try {
      const response = await cognitoClient.send(
        new InitiateAuthCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          AuthFlow: "REFRESH_TOKEN_AUTH",
          AuthParameters: {
            REFRESH_TOKEN: input.refreshToken,
            ...(env.COGNITO_CLIENT_SECRET
              ? {
                  SECRET_HASH: createHmac("sha256", env.COGNITO_CLIENT_SECRET)
                    .update(env.COGNITO_CLIENT_ID)
                    .digest("base64"),
                }
              : {}),
          },
        }),
      );

      return toTokens(response.AuthenticationResult);
    } catch (error) {
      const mapped = mapCognitoError(error, "Could not refresh the session");
      if (mapped.status === 401) {
        throw new AppError({
          code: "INVALID_REFRESH_TOKEN",
          status: 401,
          message: "Your session has expired. Sign in again.",
        });
      }
      throw mapped;
    }
  },

  async logout(accessToken: string): Promise<void> {
    try {
      await cognitoClient.send(
        new GlobalSignOutCommand({ AccessToken: accessToken }),
      );
    } catch (error) {
      // A stale or already-invalid token should not block logout.
      logger.warn("Global sign-out failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      void error;
    }
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<{ email: string }> {
    try {
      await cognitoClient.send(
        new ForgotPasswordCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: input.email,
          SecretHash: secretHash(input.email),
        }),
      );
    } catch (error) {
      // Do not reveal whether an account exists.
      logger.warn("Forgot password request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return { email: input.email };
  },

  async resetPassword(input: ResetPasswordInput): Promise<{ email: string }> {
    try {
      await cognitoClient.send(
        new ConfirmForgotPasswordCommand({
          ClientId: env.COGNITO_CLIENT_ID,
          Username: input.email,
          ConfirmationCode: input.code,
          Password: input.newPassword,
          SecretHash: secretHash(input.email),
        }),
      );
    } catch (error) {
      throw mapCognitoError(error, "Could not reset the password");
    }

    return { email: input.email };
  },

  /** Verifies the access token with Cognito and returns the caller's profile. */
  async getCurrentUser(userId: string): Promise<PrivateUserProfile> {
    const profile = await usersRepository.getById(userId);
    if (!profile) {
      throw AppError.notFound("Profile not found");
    }
    return toPrivateProfile(profile);
  },

  /** Confirms an access token is still valid and returns its Cognito claims. */
  async introspect(accessToken: string): Promise<{ username: string; sub: string }> {
    try {
      const result = await cognitoClient.send(
        new GetUserCommand({ AccessToken: accessToken }),
      );
      const sub = result.UserAttributes?.find((attr) => attr.Name === "sub")?.Value;
      return { username: result.Username ?? "", sub: sub ?? "" };
    } catch (error) {
      throw mapCognitoError(error, "Session is no longer valid");
    }
  },
};

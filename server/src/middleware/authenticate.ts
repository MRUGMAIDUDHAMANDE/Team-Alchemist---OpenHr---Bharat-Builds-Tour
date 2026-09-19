import type { NextFunction, Request, Response } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

/**
 * Verifies the Cognito access token on every protected request. Verification is
 * stateless (JWKS are cached by aws-jwt-verify), so we never call Cognito on the
 * hot path. Authorization on the resource itself must still be enforced in the
 * service/repository layer — a valid token only proves *who* the caller is.
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: env.COGNITO_USER_POOL_ID,
  tokenUse: "access",
  clientId: env.COGNITO_CLIENT_ID,
});

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    next(AppError.unauthorized("Sign in to continue"));
    return;
  }

  const token = header.slice(7).trim();

  try {
    const payload = await verifier.verify(token);
    req.auth = {
      userId: payload.sub,
      username: typeof payload.username === "string" ? payload.username : "",
      groups: (payload["cognito:groups"] as string[] | undefined) ?? [],
    };
    next();
  } catch {
    next(AppError.unauthorized("Your session is invalid or has expired"));
  }
}

/** Guard that only lets users in a Cognito group through (e.g. ADMIN). */
export function requireGroup(group: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(AppError.unauthorized());
      return;
    }
    if (!req.auth.groups.includes(group)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}

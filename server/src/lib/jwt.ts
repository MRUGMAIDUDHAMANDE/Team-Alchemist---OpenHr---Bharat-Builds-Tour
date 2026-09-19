/**
 * Minimal JWT payload decoding.
 *
 * These tokens are received directly from Amazon Cognito over TLS, and are
 * verified with `aws-jwt-verify` wherever they are trusted for authorization
 * (see middleware/authenticate.ts). Here we only need to read claims we just
 * got back from the token endpoint, so a decode without a second signature
 * check is sufficient — and cheaper than an extra Cognito call.
 */
export function decodeJwtPayload<T extends Record<string, unknown>>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT");
  }

  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as T;
}

export interface IdTokenClaims extends Record<string, unknown> {
  sub: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
  "cognito:groups"?: string[];
}

export interface AccessTokenClaims extends Record<string, unknown> {
  sub: string;
  username?: string;
  scope?: string;
  "cognito:groups"?: string[];
}

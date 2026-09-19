import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
  signupSchema,
} from "../src/modules/auth/auth.schemas";
import { mapCognitoError } from "../src/modules/auth/auth.errors";
import { isAppError } from "../src/lib/errors";

/**
 * Unit tests for the auth surface that does not require AWS credentials.
 * Cognito itself is exercised in integration tests against a deployed pool.
 */

function cognitoError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe("signupSchema", () => {
  it("accepts a valid signup and normalises the email", () => {
    const parsed = signupSchema.parse({
      name: "  Rahul Sharma  ",
      email: "  Rahul@Example.COM ",
      password: "Sup3rSecret!",
    });

    assert.equal(parsed.email, "rahul@example.com");
    assert.equal(parsed.name, "Rahul Sharma");
  });

  it("rejects a password that violates the Cognito policy", () => {
    const result = signupSchema.safeParse({
      name: "Rahul Sharma",
      email: "rahul@example.com",
      password: "weakpassword",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const messages = result.error.flatten().fieldErrors.password ?? [];
      assert.ok(messages.length >= 2, "expected several password policy messages");
    }
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Rahul Sharma",
      email: "not-an-email",
      password: "Sup3rSecret!",
    });
    assert.equal(result.success, false);
  });
});

describe("passwordSchema", () => {
  const rejected: [string, string][] = [
    ["short1!", "too short"],
    ["alllowercase1!", "no uppercase"],
    ["ALLUPPERCASE1!", "no lowercase"],
    ["NoNumbers!!", "no digit"],
    ["NoSymbols123", "no symbol"],
  ];

  for (const [password, reason] of rejected) {
    it(`rejects ${password} (${reason})`, () => {
      assert.equal(passwordSchema.safeParse(password).success, false);
    });
  }

  it("accepts a compliant password", () => {
    assert.equal(passwordSchema.safeParse("Sup3rSecret!").success, true);
  });
});

describe("loginSchema", () => {
  it("trims and lowercases the email", () => {
    const parsed = loginSchema.parse({ email: " Rahul@Example.com ", password: "x" });
    assert.equal(parsed.email, "rahul@example.com");
  });

  it("requires a non-empty password", () => {
    assert.equal(loginSchema.safeParse({ email: "a@b.com", password: "" }).success, false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires a 6 digit code", () => {
    const result = resetPasswordSchema.safeParse({
      email: "a@b.com",
      code: "123",
      newPassword: "Sup3rSecret!",
    });
    assert.equal(result.success, false);
  });

  it("accepts a valid reset payload", () => {
    const result = resetPasswordSchema.safeParse({
      email: "a@b.com",
      code: "123456",
      newPassword: "Sup3rSecret!",
    });
    assert.equal(result.success, true);
  });
});

describe("mapCognitoError", () => {
  it("maps duplicate signups to a 409 conflict", () => {
    const mapped = mapCognitoError(cognitoError("UsernameExistsException"), "fallback");
    assert.ok(isAppError(mapped));
    assert.equal(mapped.status, 409);
    assert.equal(mapped.code, "USER_ALREADY_EXISTS");
  });

  it("maps bad credentials to a 401 without leaking whether the user exists", () => {
    const mapped = mapCognitoError(cognitoError("NotAuthorizedException"), "fallback");
    assert.ok(isAppError(mapped));
    assert.equal(mapped.status, 401);
    assert.equal(mapped.code, "INVALID_CREDENTIALS");
  });

  it("maps an unconfirmed user to a 403", () => {
    const mapped = mapCognitoError(cognitoError("UserNotConfirmedException"), "fallback");
    assert.ok(isAppError(mapped));
    assert.equal(mapped.status, 403);
    assert.equal(mapped.code, "USER_NOT_CONFIRMED");
  });

  it("maps throttling to a 429", () => {
    const mapped = mapCognitoError(cognitoError("TooManyRequestsException"), "fallback");
    assert.ok(isAppError(mapped));
    assert.equal(mapped.status, 429);
  });

  it("passes existing AppErrors through unchanged", () => {
    const original = mapCognitoError(cognitoError("NotAuthorizedException"), "fallback");
    const again = mapCognitoError(original, "fallback");
    assert.equal(again, original);
  });
});

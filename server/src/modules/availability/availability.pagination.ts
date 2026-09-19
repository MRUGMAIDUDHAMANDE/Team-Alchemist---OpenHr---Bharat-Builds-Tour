import { AppError } from "../../lib/errors";

export function decodePageCursor(cursor: string | undefined): Record<string, unknown> | undefined {
  if (!cursor) return undefined;

  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // Fall through to the invalid cursor error below.
  }

  throw AppError.badRequest("Pagination cursor is invalid.");
}

export function encodePageCursor(key: Record<string, unknown> | undefined): string | null {
  if (!key) return null;
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

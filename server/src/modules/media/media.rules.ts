import { AppError } from "../../lib/errors";
import type { MediaPurpose } from "./media.types";

interface PurposePolicy {
  contentTypes: Record<string, string>;
  maxBytes: number;
}

const POLICIES: Record<MediaPurpose, PurposePolicy> = {
  profile: {
    contentTypes: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
    maxBytes: 5 * 1024 * 1024,
  },
  portfolio: {
    contentTypes: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
    maxBytes: 10 * 1024 * 1024,
  },
  task: {
    contentTypes: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" },
    maxBytes: 10 * 1024 * 1024,
  },
};

export function policyFor(purpose: MediaPurpose): PurposePolicy {
  return POLICIES[purpose];
}

export function assertUploadAllowed(purpose: MediaPurpose, contentType: string, sizeBytes: number): string {
  const policy = policyFor(purpose);
  const extension = policy.contentTypes[contentType];
  if (!extension) {
    throw AppError.badRequest(`Files of type ${contentType} are not allowed for ${purpose} uploads.`);
  }
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw AppError.badRequest("File size must be a positive number of bytes.");
  }
  if (sizeBytes > policy.maxBytes) {
    throw AppError.badRequest(`Files for ${purpose} uploads must be at most ${policy.maxBytes / 1024 / 1024} MB.`);
  }
  return extension;
}

export function parseMediaKey(s3Key: string): { ownerId: string; purpose: MediaPurpose } {
  const match = /^users\/([^/]+)\/(profile|portfolio|task)\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$/.exec(s3Key);
  if (!match) {
    throw AppError.badRequest("Unrecognized file reference.");
  }
  return { ownerId: match[1], purpose: match[2] as MediaPurpose };
}

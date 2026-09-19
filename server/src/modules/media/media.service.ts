import { randomUUID } from "node:crypto";
import type { StoragePort } from "../../aws/storage";
import { AppError } from "../../lib/errors";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import { assertUploadAllowed, parseMediaKey, policyFor } from "./media.rules";
import type { mediaRepository } from "./media.repository";
import type { ConfirmUploadInput, ListMediaQuery, UploadUrlInput } from "./media.schemas";
import type { MediaItem } from "./media.types";
import type { usersRepository } from "../users/users.repository";

export type MediaStore = Pick<typeof mediaRepository, "create" | "getById" | "listByOwner">;
export type PhotoProfileStore = Pick<typeof usersRepository, "getById" | "updateProfile">;

export interface MediaPage {
  items: MediaItem[];
  nextCursor: string | null;
}

function storageUnavailable(error: unknown): AppError {
  return AppError.internal("File uploads are temporarily unavailable.", error);
}

export const mediaService = {
  async createUploadUrl(userId: string, input: UploadUrlInput, storage: StoragePort): Promise<{ s3Key: string; uploadUrl: string; expiresIn: number }> {
    const extension = assertUploadAllowed(input.purpose, input.contentType, input.sizeBytes);
    const s3Key = `users/${userId}/${input.purpose}/${randomUUID()}.${extension}`;

    try {
      const uploadUrl = await storage.presignedPutUrl(s3Key, input.contentType, input.sizeBytes);
      return { s3Key, uploadUrl, expiresIn: 300 };
    } catch (error) {
      throw storageUnavailable(error);
    }
  },

  async confirmUpload(
    userId: string,
    input: ConfirmUploadInput,
    storage: StoragePort,
    mediaStore: MediaStore,
    profileStore: PhotoProfileStore,
  ): Promise<MediaItem> {
    const parsed = parseMediaKey(input.s3Key);
    if (parsed.ownerId !== userId) {
      throw AppError.forbidden("You cannot confirm another user's upload.");
    }

    let stored: { contentType?: string; sizeBytes?: number } | null;
    try {
      stored = await storage.headObject(input.s3Key);
    } catch (error) {
      throw storageUnavailable(error);
    }
    if (!stored) {
      throw AppError.badRequest("No uploaded file was found for that reference. Upload it first.");
    }

    const policy = policyFor(parsed.purpose);
    if (!stored.contentType || !policy.contentTypes[stored.contentType]) {
      throw AppError.badRequest("The uploaded file type does not match an allowed type.");
    }
    if (!stored.sizeBytes || stored.sizeBytes > policy.maxBytes) {
      throw AppError.badRequest("The uploaded file exceeds the allowed size.");
    }

    const item: MediaItem = {
      mediaId: randomUUID(),
      ownerId: userId,
      purpose: parsed.purpose,
      s3Key: input.s3Key,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      createdAt: new Date().toISOString(),
    };
    await mediaStore.create(item);

    if (parsed.purpose === "profile") {
      const profile = await profileStore.getById(userId);
      if (!profile) {
        throw AppError.notFound("Profile not found");
      }
      await profileStore.updateProfile(userId, { profilePhotoKey: input.s3Key });
    }

    return item;
  },

  async listMine(userId: string, query: ListMediaQuery, store: MediaStore): Promise<MediaPage> {
    const result = await store.listByOwner(userId, query.purpose, query.limit, decodePageCursor(query.cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },

  async createViewUrlByKey(userId: string, s3Key: string, storage: StoragePort): Promise<{ viewUrl: string; expiresIn: number }> {
    const parsed = parseMediaKey(s3Key);
    if (parsed.ownerId !== userId) {
      throw AppError.forbidden("You cannot view another user's file.");
    }
    try {
      const viewUrl = await storage.presignedGetUrl(s3Key);
      return { viewUrl, expiresIn: 300 };
    } catch (error) {
      throw storageUnavailable(error);
    }
  },

  async createViewUrl(userId: string, mediaId: string, storage: StoragePort, store: MediaStore): Promise<{ viewUrl: string; expiresIn: number }> {
    const item = await store.getById(mediaId);
    if (!item || item.ownerId !== userId) {
      throw AppError.notFound("File not found");
    }
    try {
      const viewUrl = await storage.presignedGetUrl(item.s3Key);
      return { viewUrl, expiresIn: 300 };
    } catch (error) {
      throw storageUnavailable(error);
    }
  },
};

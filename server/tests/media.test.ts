import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StoragePort } from "../src/aws/storage";
import { isAppError } from "../src/lib/errors";
import { assertUploadAllowed, parseMediaKey, policyFor } from "../src/modules/media/media.rules";
import { confirmUploadSchema, uploadUrlSchema } from "../src/modules/media/media.schemas";
import { mediaService, type MediaStore, type PhotoProfileStore } from "../src/modules/media/media.service";
import type { MediaItem } from "../src/modules/media/media.types";
import type { UserProfile } from "../src/modules/users/users.types";

const KEY = "users/user-1/profile/123e4567-e89b-42d3-a456-426614174000.jpg";

function createStorage(head: { contentType?: string; sizeBytes?: number } | null = { contentType: "image/jpeg", sizeBytes: 1024 }): StoragePort & { puts: Array<unknown> } {
  const puts: Array<unknown> = [];
  return {
    puts,
    async presignedPutUrl(key: string, contentType: string, sizeBytes: number) {
      puts.push({ key, contentType, sizeBytes });
      return `https://uploads.example/${key}`;
    },
    async headObject() {
      return head;
    },
    async presignedGetUrl(key: string) {
      return `https://views.example/${key}`;
    },
  };
}

function createStores(profile: UserProfile | null = { userId: "user-1" } as UserProfile) {
  const created: MediaItem[] = [];
  const patched: Array<unknown> = [];
  const mediaStore: MediaStore = {
    async create(item: MediaItem) {
      created.push(item);
      return item;
    },
    async getById() {
      return created[0] ?? null;
    },
    async listByOwner() {
      return { items: created };
    },
  };
  const profileStore: PhotoProfileStore = {
    async getById() {
      return profile;
    },
    async updateProfile(userId: string, patch: unknown) {
      patched.push({ userId, patch });
      assert.ok(profile);
      return { ...profile, ...(patch as object) };
    },
  };
  return { mediaStore, profileStore, created, patched };
}

describe("media rules", () => {
  it("limits profile uploads to small images", () => {
    assert.equal(assertUploadAllowed("profile", "image/png", 1024), "png");
    assert.throws(() => assertUploadAllowed("profile", "application/pdf", 1024));
    assert.throws(() => assertUploadAllowed("profile", "image/png", 6 * 1024 * 1024));
  });

  it("allows PDFs for task uploads", () => {
    assert.equal(assertUploadAllowed("task", "application/pdf", 1024), "pdf");
  });

  it("parses only well-formed keys", () => {
    assert.deepEqual(parseMediaKey(KEY), { ownerId: "user-1", purpose: "profile" });
    assert.throws(() => parseMediaKey("users/user-1/profile/evil.exe"));
    assert.throws(() => parseMediaKey("users/user-1/profile/../../x.jpg"));
  });

  it("exposes the policy bounds", () => {
    assert.equal(policyFor("portfolio").maxBytes, 10 * 1024 * 1024);
  });
});

describe("mediaService.createUploadUrl", () => {
  it("derives the extension from the content type", async () => {
    const storage = createStorage();
    const result = await mediaService.createUploadUrl("user-1", { purpose: "profile", contentType: "image/png", sizeBytes: 2048 }, storage);

    assert.match(result.s3Key, /^users\/user-1\/profile\/[0-9a-f-]{36}\.png$/);
    assert.ok(result.uploadUrl.includes(result.s3Key));
    assert.equal(result.expiresIn, 300);
    assert.equal(storage.puts.length, 1);
  });
});

describe("mediaService.confirmUpload", () => {
  it("stores metadata and links profile photos", async () => {
    const storage = createStorage();
    const stores = createStores();
    const item = await mediaService.confirmUpload("user-1", { s3Key: KEY }, storage, stores.mediaStore, stores.profileStore);

    assert.equal(item.purpose, "profile");
    assert.equal(item.contentType, "image/jpeg");
    assert.equal(stores.created.length, 1);
    assert.deepEqual(stores.patched, [{ userId: "user-1", patch: { profilePhotoKey: KEY } }]);
  });

  it("rejects another user's key", async () => {
    const storage = createStorage();
    const stores = createStores();
    await assert.rejects(
      mediaService.confirmUpload("user-2", { s3Key: KEY }, storage, stores.mediaStore, stores.profileStore),
      (error: unknown) => isAppError(error) && error.status === 403,
    );
    assert.equal(stores.created.length, 0);
  });

  it("rejects missing uploads", async () => {
    const storage = createStorage(null);
    const stores = createStores();
    await assert.rejects(
      mediaService.confirmUpload("user-1", { s3Key: KEY }, storage, stores.mediaStore, stores.profileStore),
      (error: unknown) => isAppError(error) && error.status === 400,
    );
  });

  it("rejects mismatched stored types", async () => {
    const storage = createStorage({ contentType: "application/pdf", sizeBytes: 1024 });
    const stores = createStores();
    await assert.rejects(
      mediaService.confirmUpload("user-1", { s3Key: KEY }, storage, stores.mediaStore, stores.profileStore),
      (error: unknown) => isAppError(error) && error.status === 400,
    );
  });
});

describe("mediaService.createViewUrl", () => {
  it("hides other users' files", async () => {
    const storage = createStorage();
    const stores = createStores();
    await mediaService.confirmUpload("user-1", { s3Key: KEY }, storage, stores.mediaStore, stores.profileStore);

    const result = await mediaService.createViewUrl("user-1", stores.created[0].mediaId, storage, stores.mediaStore);
    assert.ok(result.viewUrl.includes(KEY));

    await assert.rejects(
      mediaService.createViewUrl("user-2", stores.created[0].mediaId, storage, stores.mediaStore),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });
});

describe("mediaService.createViewUrlByKey", () => {
  it("signs short-lived URLs for the owner's own key", async () => {
    const storage = createStorage();
    const result = await mediaService.createViewUrlByKey("user-1", KEY, storage);
    assert.ok(result.viewUrl.includes(KEY));
    assert.equal(result.expiresIn, 300);
  });

  it("refuses other users' keys", async () => {
    const storage = createStorage();
    await assert.rejects(
      mediaService.createViewUrlByKey("user-2", KEY, storage),
      (error: unknown) => isAppError(error) && error.status === 403,
    );
  });
});

describe("media schemas", () => {
  it("validates upload requests", () => {
    assert.equal(uploadUrlSchema.safeParse({ purpose: "profile", contentType: "image/jpeg", sizeBytes: 100 }).success, true);
    assert.equal(uploadUrlSchema.safeParse({ purpose: "avatar", contentType: "image/jpeg", sizeBytes: 100 }).success, false);
    assert.equal(confirmUploadSchema.safeParse({ s3Key: "" }).success, false);
  });
});

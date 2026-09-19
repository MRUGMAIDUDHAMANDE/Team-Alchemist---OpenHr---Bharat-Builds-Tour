import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { s3Client } from "./clients";

const PUT_URL_TTL_SECONDS = 5 * 60;
const GET_URL_TTL_SECONDS = 5 * 60;

function bucket(): string {
  if (!env.S3_BUCKET_NAME) {
    throw new Error("S3_BUCKET_NAME is not configured.");
  }
  return env.S3_BUCKET_NAME;
}

export interface StoragePort {
  presignedPutUrl(key: string, contentType: string, sizeBytes: number): Promise<string>;
  headObject(key: string): Promise<{ contentType?: string; sizeBytes?: number } | null>;
  presignedGetUrl(key: string): Promise<string>;
}

async function missingBucketError(error: unknown): Promise<null> {
  if (error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey")) {
    return null;
  }
  throw error;
}

export const storage: StoragePort = {
  async presignedPutUrl(key: string, contentType: string, sizeBytes: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });
    return getSignedUrl(s3Client, command, { expiresIn: PUT_URL_TTL_SECONDS });
  },

  async headObject(key: string): Promise<{ contentType?: string; sizeBytes?: number } | null> {
    try {
      const result = await s3Client.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
      return { contentType: result.ContentType, sizeBytes: result.ContentLength };
    } catch (error) {
      return missingBucketError(error);
    }
  },

  async presignedGetUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: GET_URL_TTL_SECONDS });
  },
};

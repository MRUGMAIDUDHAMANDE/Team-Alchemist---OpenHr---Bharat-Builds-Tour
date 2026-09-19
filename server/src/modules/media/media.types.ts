export type MediaPurpose = "profile" | "portfolio" | "task";

export interface MediaItem {
  mediaId: string;
  ownerId: string;
  purpose: MediaPurpose;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

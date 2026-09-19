import { apiRequest } from "@/lib/api/client";

export type MediaPurpose = "profile" | "portfolio" | "task";

export const mediaApi = {
  createUploadUrl(input: { purpose: MediaPurpose; contentType: string; sizeBytes: number }) {
    return apiRequest<{ s3Key: string; uploadUrl: string; expiresIn: number }>("/media/upload-url", {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  confirmUpload(s3Key: string) {
    return apiRequest<{ media: unknown }>("/media/confirm", {
      method: "POST",
      body: { s3Key },
      auth: true,
    });
  },

  viewUrl(s3Key: string) {
    const params = new URLSearchParams({ key: s3Key });
    return apiRequest<{ viewUrl: string; expiresIn: number }>(`/media/view-url?${params.toString()}`, {
      auth: true,
    });
  },
};

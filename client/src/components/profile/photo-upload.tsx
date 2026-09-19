"use client";

import { useRef, useState } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { mediaApi } from "@/lib/media/api";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

interface PhotoUploadProps {
  onUploaded: () => void;
}

export function PhotoUpload({ onUploaded }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photos must be at most 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const { s3Key, uploadUrl } = await mediaApi.createUploadUrl({
        purpose: "profile",
        contentType: file.type,
        sizeBytes: file.size,
      });
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        throw new Error("Upload to storage failed.");
      }
      await mediaApi.confirmUpload(s3Key);
      toast.success("Photo updated");
      onUploaded();
    } catch (uploadError) {
      setError(
        uploadError instanceof ApiError
          ? uploadError.message
          : "Photo could not be uploaded. Try again.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        aria-label="Upload profile photo"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2Icon className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
        {uploading ? "Uploading photo" : "Upload photo"}
      </Button>
      <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 5 MB.</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { mediaApi } from "@/lib/media/api";
import { cn } from "@/lib/utils";

interface ProfilePhotoProps {
  s3Key: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "size-7 text-xs",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
};

export function ProfilePhoto({ s3Key, name, size = "md", className }: ProfilePhotoProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!s3Key) return;

    let active = true;
    mediaApi
      .viewUrl(s3Key)
      .then(({ viewUrl }) => {
        if (active) setUrl(viewUrl);
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [s3Key]);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn("shrink-0 rounded-full bg-accent object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground",
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}

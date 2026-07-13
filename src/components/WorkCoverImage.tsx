"use client";

import { useState } from "react";

/** 썸네일 없음·로드 실패 시 allblu fallback (제공 에셋) */
export const FALLBACK_IMAGE = "/fallback-image.png";

export default function WorkCoverImage({
  src,
  alt,
  className = "absolute inset-0 h-full w-full object-cover",
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={showFallback ? FALLBACK_IMAGE : src}
      alt={alt}
      className={className}
      loading={loading}
      draggable={false}
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}

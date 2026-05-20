"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface FileBlockProps {
  url: string;
  filename?: string;
  fileType?: string;
  mediaId?: string;
  lessonId?: string;
  useSignedUrl?: boolean;
}

export function FileBlock({ url, filename, fileType, mediaId, lessonId, useSignedUrl }: FileBlockProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (!useSignedUrl || !mediaId || !lessonId) return;

    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/lessons/${lessonId}/media/${mediaId}/signed-url`);
      if (!res.ok) {
        throw new Error("Не удалось получить ссылку");
      }
      const data = await res.json();
      setSignedUrl(data.data.url);
      window.open(data.data.url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  const href = useSignedUrl && signedUrl ? signedUrl : url;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      className="flex items-center gap-3 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest p-4 shadow-m3-soft transition-all duration-200 ease-in-out active:scale-[0.98] hover:shadow-m3-soft-hover hover:border-m3-outline"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-m3-primary-container text-m3-primary">
        <Icon name="description" size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-body-md text-m3-on-surface">{filename ?? "Файл"}</p>
        {fileType && <p className="text-label-sm font-label-sm text-m3-on-surface-variant">{fileType}</p>}
      </div>
      {loading ? (
        <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-m3-primary border-t-transparent" />
      ) : (
        <Icon name="download" size={16} className="shrink-0 text-m3-on-surface-variant" />
      )}
    </a>
  );
}

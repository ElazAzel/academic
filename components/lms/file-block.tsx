"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

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
      className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename ?? "Файл"}</p>
        {fileType && <p className="text-xs text-muted-foreground">{fileType}</p>}
      </div>
      {loading ? (
        <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </a>
  );
}

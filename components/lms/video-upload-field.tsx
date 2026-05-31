"use client";

import { useState, useRef } from "react";
import { FileVideo, X, Loader2 } from "lucide-react";
import { uploadLessonMediaAction } from "@/server/actions/files";

interface VideoUploadFieldProps {
  lessonId: string;
  onUploaded: (url: string) => void;
}

export function VideoUploadField({ lessonId, onUploaded }: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/") && !file.name.endsWith(".m3u8")) {
      setError("Можно загружать только видеофайлы (MP4, M3U8)");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/media/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: "lesson-videos",
          filename: file.name,
          contentType: file.type || "video/mp4",
        }),
      });
      const { publicUrl } = await res.json();
      await uploadLessonMediaAction(lessonId, "video", publicUrl, file.name);
      onUploaded(publicUrl);
    } catch {
      setError("Ошибка загрузки видео");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-muted-foreground/50"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        role="button"
        tabIndex={0}
        aria-label="Загрузить видео"
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка...
          </div>
        ) : (
          <>
            <FileVideo className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Нажмите, чтобы загрузить видео (MP4, M3U8)
            </span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/mpeg,application/vnd.apple.mpegurl,.m3u8"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <X className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

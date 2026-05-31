"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

export function HlsPlayer({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
    }

    return () => {
      hls?.destroy();
    };
  }, [url]);

  return (
    <video
      ref={videoRef}
      controls
      className={className ?? "absolute inset-0 h-full w-full"}
      playsInline
    >
      <track kind="captions" />
    </video>
  );
}

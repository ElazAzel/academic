"use client";

import { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import type { LessonVideo } from "@/types/domain";

export interface VideoBlockProps {
  video?: LessonVideo;
  videoUrl?: string;
  title?: string;
  duration?: number;
  onProgress?: (percent: number) => void;
  showWatermark?: boolean;
  watermarkOverlay?: React.ReactNode;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.slice(7);
      if (u.pathname.startsWith("/live/")) return u.pathname.slice(6);
      if (u.pathname.startsWith("/shorts/")) return u.pathname.slice(8);
    }
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
  } catch {
    /* ignore invalid URLs */
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "vimeo.com" || u.hostname === "player.vimeo.com") {
      // /123456789 or /123456789?param=val
      return u.pathname.replace(/^\/|\/.*$/g, "") || null;
    }
  } catch {
    /* ignore invalid URLs */
  }
  return null;
}

function normalizeYouTubeUrl(url: string): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;
}

function normalizeVimeoUrl(url: string): string {
  const id = extractVimeoId(url);
  if (!id) return url;
  return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`;
}

function resolveEmbedUrl(video: LessonVideo): string | null {
  if (video.provider === "youtube") {
    return `https://www.youtube.com/embed/${video.providerVideoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;
  }
  if (video.provider === "vimeo") {
    return `https://player.vimeo.com/video/${video.providerVideoId}?dnt=1`;
  }
  return video.embedUrl ?? null;
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => {
        getCurrentTime(): number;
        getDuration(): number;
        destroy(): void;
      };
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_STATES = {
  PLAYING: 1,
  PAUSED: 2,
  ENDED: 0,
  BUFFERING: 3,
} as const;

function useYouTubePlayer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  videoId: string | null,
  onProgress: ((percent: number) => void) | undefined,
) {
  const playerRef = useRef<{ getCurrentTime(): number; getDuration(): number } | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const milestones = new Set<number>();
    const vid = videoId;
    const el = containerRef.current;
    if (!vid || !el) return;

    let cleanup = false;

    function createPlayer() {
      if (!el || cleanup) return;
      const YT = window.YT;
      if (!YT) return;

      try {
        const player = new YT.Player(el, {
          videoId: vid,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onStateChange: (event: { data: number }) => {
              if (event.data === YT_STATES.PLAYING) {
                startTracking(player);
              }
              if (event.data === YT_STATES.PAUSED || event.data === YT_STATES.BUFFERING) {
                stopTracking();
              }
              if (event.data === YT_STATES.ENDED) {
                stopTracking();
                if (!milestones.has(100)) {
                  milestones.add(100);
                  onProgressRef.current?.(100);
                }
              }
            },
          },
        });
        playerRef.current = player;
      destroyRef.current = () => { try { player.destroy(); } catch { /* ignore */ } };
      } catch (e) {
        console.error("YouTube Player creation failed:", e);
      }
    }

    function startTracking(player: { getCurrentTime(): number; getDuration(): number }) {
      stopTracking();
      intervalRef.current = setInterval(() => {
        if (cleanup) {
          stopTracking();
          return;
        }
        try {
          const current = player.getCurrentTime();
          const duration = player.getDuration();
          if (duration <= 0) return;
          const percent = Math.round((current / duration) * 100);
          [25, 50, 75, 100].forEach((m) => {
            if (percent >= m && !milestones.has(m)) {
              milestones.add(m);
              onProgressRef.current?.(m);
            }
          });
        } catch {
          stopTracking();
        }
      }, 2000);
    }

    function stopTracking() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScript = document.getElementsByTagName("script")[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);

      window.onYouTubeIframeAPIReady = () => {
        if (!cleanup) createPlayer();
      };
    } else {
      createPlayer();
    }

    return () => {
      cleanup = true;
      stopTracking();
      milestones.clear();
      destroyRef.current?.();
      destroyRef.current = null;
      playerRef.current = null;
    };
  }, [videoId, containerRef]);
}

export function VideoBlock({ video, videoUrl, title, duration, onProgress, showWatermark, watermarkOverlay }: VideoBlockProps) {
  const { data: session } = useSession();
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const resolvedVideo =
    video?.provider && video?.providerVideoId ? video : null;

  const isYouTube = resolvedVideo?.provider === "youtube";
  const isVimeo = resolvedVideo?.provider === "vimeo";
  const youTubeVideoId = isYouTube ? resolvedVideo!.providerVideoId : null;

  const useIFrameAPI = isYouTube && !!onProgress;

  const plainEmbedUrl = !useIFrameAPI
    ? resolvedVideo
      ? resolveEmbedUrl(resolvedVideo)
      : videoUrl
        ? extractVimeoId(videoUrl)
          ? normalizeVimeoUrl(videoUrl)
          : normalizeYouTubeUrl(videoUrl)
        : null
    : null;

  const isPrivate = resolvedVideo?.isPrivate ?? false;
  const canWatch = !isPrivate || !!session?.user;

  useYouTubePlayer(
    useIFrameAPI ? playerContainerRef : ({ current: null } as React.RefObject<HTMLDivElement | null>),
    useIFrameAPI ? youTubeVideoId : null,
    onProgress,
  );

  const displayTitle =
    title ?? resolvedVideo?.providerVideoId ?? undefined;

  const displayDuration =
    duration ??
    (resolvedVideo?.durationSeconds
      ? Math.round(resolvedVideo.durationSeconds / 60)
      : undefined);

  if (!resolvedVideo && !videoUrl) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-m3-outline-variant bg-m3-surface-container-lowest shadow-m3-soft transition-all duration-200 ease-in-out hover:shadow-m3-soft-hover">
      <div className="relative aspect-video bg-m3-surface-container-high">
        {canWatch ? (
          useIFrameAPI ? (
            <div ref={playerContainerRef} className="absolute inset-0" />
          ) : plainEmbedUrl ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={plainEmbedUrl}
              title={displayTitle || "Видео"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            ) : resolvedVideo ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-body-md font-body-md text-m3-on-surface-variant">
                Видео на платформе {resolvedVideo.provider}
              </p>
            </div>
          ) : null
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-m3-surface-container-high">
                <svg
                  className="h-6 w-6 text-m3-on-surface-variant/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <p className="text-body-md font-body-md text-m3-on-surface-variant">
                Видео доступно только авторизованным пользователям
              </p>
            </div>
          </div>
        )}

        {showWatermark && watermarkOverlay && (
          <div className="pointer-events-none absolute inset-0 z-10">
            {watermarkOverlay}
          </div>
        )}
      </div>

      {(displayTitle || displayDuration) && (
        <div className="flex items-center justify-between gap-3 border-t border-m3-outline-variant px-4 py-3">
          {displayTitle && (
            <p className="truncate text-body-md font-body-md text-m3-on-surface">{displayTitle}</p>
          )}
          {displayDuration && (
            <Badge className="shrink-0 border-m3-primary-fixed-dim bg-m3-primary-fixed text-m3-primary">
              {displayDuration} мин.
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

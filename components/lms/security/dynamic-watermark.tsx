"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { CONTENT_PROTECTION } from "@/lib/constants";

type WatermarkPosition = (typeof CONTENT_PROTECTION.WATERMARK_POSITIONS)[number];

interface DynamicWatermarkProps {
  userName?: string | null;
  userEmail: string;
  userId: string;
  courseId?: string;
  lessonId?: string;
  className?: string;
}

function generateShortHash(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6).toUpperCase();
}

function buildWatermarkText(
  userName: string | null | undefined,
  userEmail: string,
  userId: string,
): string {
  const shortHash = generateShortHash(userId);
  const name = userName && userName.trim() ? userName : null;
  const identifier = name ?? userEmail;
  return `${identifier} • ${shortHash}`;
}

const positionClasses: Record<WatermarkPosition, string> = {
  "top-left": "top-8 left-8",
  "top-right": "top-8 right-8",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  "bottom-left": "bottom-8 left-8",
  "bottom-right": "bottom-8 right-8",
};

export function DynamicWatermark({
  userName,
  userEmail,
  userId,
  courseId,
  lessonId,
  className,
}: DynamicWatermarkProps) {
  const [position, setPosition] = useState<WatermarkPosition>("top-left");
  const [dateTime, setDateTime] = useState<string>("");

  const watermarkText = useMemo(
    () => buildWatermarkText(userName, userEmail, userId),
    [userName, userEmail, userId],
  );

  const cyclePosition = useCallback(() => {
    const positions = CONTENT_PROTECTION.WATERMARK_POSITIONS;
    const currentIndex = positions.indexOf(position);
    const nextIndex = (currentIndex + 1) % positions.length;
    setPosition(positions[nextIndex]);
  }, [position]);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setDateTime(
        now.toLocaleDateString("ru-RU") +
          " " +
          now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      );
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(
      cyclePosition,
      CONTENT_PROTECTION.WATERMARK_POSITION_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [cyclePosition]);

  const fullText = `${watermarkText} • ${dateTime}`;

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-30 select-none transition-all duration-1000 ease-in-out",
        positionClasses[position],
        className,
      )}
      style={{
        opacity: CONTENT_PROTECTION.WATERMARK_OPACITY_MIN +
          Math.random() * (CONTENT_PROTECTION.WATERMARK_OPACITY_MAX - CONTENT_PROTECTION.WATERMARK_OPACITY_MIN),
      }}
      aria-hidden="true"
    >
      <div className="whitespace-nowrap text-xs font-medium text-foreground sm:text-sm">
        {fullText}
      </div>
      {courseId && lessonId && (
        <div className="mt-0.5 whitespace-nowrap text-[10px] text-muted-foreground sm:text-xs">
          {courseId.slice(0, 8)} / {lessonId.slice(0, 8)}
        </div>
      )}
    </div>
  );
}

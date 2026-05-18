"use client";

import { cn } from "@/lib/utils";

interface ShapeProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

function Circle({ className, size = 120, style }: ShapeProps) {
  return (
    <div
      className={cn("rounded-full opacity-[0.07] dark:opacity-[0.04]", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

function Blob({ className, style }: ShapeProps) {
  return (
    <div
      className={cn("animate-morph opacity-[0.06] dark:opacity-[0.03]", className)}
      style={style}
    />
  );
}

function Square({ className, size = 60, style }: ShapeProps) {
  return (
    <div
      className={cn("rounded-[20%] rotate-12 opacity-[0.05] dark:opacity-[0.03]", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

function Ring({ className, size = 80, style }: ShapeProps) {
  return (
    <div
      className={cn("rounded-full border-2 opacity-[0.08] dark:opacity-[0.05]", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}

export function BackgroundAnimations() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <Circle
        size={300}
        className="animate-float-slow bg-primary/30"
        style={{ top: "5%", left: "-5%" }}
      />
      <Circle
        size={200}
        className="animate-float-delayed bg-emerald-400/30"
        style={{ top: "60%", right: "-3%" }}
      />
      <Blob
        size={180}
        className="animate-drift bg-violet-400/30"
        style={{ top: "30%", left: "15%", width: 180, height: 180 }}
      />
      <Square
        size={70}
        className="animate-float bg-amber-400/30"
        style={{ top: "15%", right: "20%" }}
      />
      <Square
        size={50}
        className="animate-drift bg-rose-400/30"
        style={{ top: "75%", left: "10%" }}
      />
      <Ring
        size={150}
        className="animate-float-delayed border-primary/20"
        style={{ top: "45%", left: "60%" }}
      />
      <Ring
        size={100}
        className="animate-drift border-emerald-400/20"
        style={{ bottom: "10%", right: "15%" }}
      />
      <Circle
        size={80}
        className="animate-pulse-glow bg-sky-400/30"
        style={{ top: "80%", left: "40%" }}
      />
      <Blob
        size={120}
        className="animate-float-slow bg-orange-400/20"
        style={{ top: "10%", right: "35%", width: 120, height: 120 }}
      />
      <Square
        size={40}
        className="animate-float-delayed bg-teal-400/30"
        style={{ bottom: "30%", right: "8%" }}
      />
    </div>
  );
}

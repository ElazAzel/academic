"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

type ThemeMode = "light" | "dark" | "system";

const THEME_CYCLE: ThemeMode[] = ["light", "dark", "system"];

const THEME_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_LABEL: Record<ThemeMode, string> = {
  light: "Светлая тема",
  dark: "Тёмная тема",
  system: "Системная тема",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const currentTheme = (theme as ThemeMode) ?? "system";
  const shouldReduce = useReducedMotion();

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(currentTheme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    setTheme(next);
  };

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground"
        disabled
        aria-label="Переключатель темы"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const Icon = THEME_ICON[currentTheme];

  return (
    <button
      onClick={cycleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={THEME_LABEL[currentTheme]}
      title={THEME_LABEL[currentTheme]}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={currentTheme}
          initial={shouldReduce ? { opacity: 1 } : { opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={shouldReduce ? { opacity: 1 } : { opacity: 0, rotate: 90, scale: 0.5 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }}
          className="flex items-center justify-center"
        >
          <Icon className="h-4 w-4" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

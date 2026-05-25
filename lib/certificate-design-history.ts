"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Undo/redo history hook for certificate template config.
 * Stores snapshots up to `maxHistory` items.
 * Works with any JSON-serializable state.
 */
export function useDesignHistory<T extends object>(
  initialState: T,
  maxHistory = 50
) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const currentRef = useRef<T>(initialState);
  const skipRef = useRef(false);

  /** Push a new snapshot (call on every meaningful change) */
  const push = useCallback(
    (next: T) => {
      if (skipRef.current) {
        skipRef.current = false;
        return;
      }
      pastRef.current = [...pastRef.current.slice(-(maxHistory - 1)), currentRef.current];
      currentRef.current = next;
      futureRef.current = [];
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(false);
    },
    [maxHistory]
  );

  const undo = useCallback((): T | null => {
    if (pastRef.current.length === 0) return null;
    const previous = pastRef.current.pop()!;
    futureRef.current = [...futureRef.current, currentRef.current];
    currentRef.current = previous;
    skipRef.current = true;
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    return previous;
  }, []);

  const redo = useCallback((): T | null => {
    if (futureRef.current.length === 0) return null;
    const next = futureRef.current.pop()!;
    pastRef.current = [...pastRef.current, currentRef.current];
    currentRef.current = next;
    skipRef.current = true;
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    return next;
  }, []);

  /** Reset history (e.g., on load or reset to defaults) */
  const reset = useCallback((state: T) => {
    pastRef.current = [];
    futureRef.current = [];
    currentRef.current = state;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { undo, redo, push, reset, canUndo, canRedo };
}

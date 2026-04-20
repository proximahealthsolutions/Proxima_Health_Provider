"use client";

import { useEffect, useRef } from "react";

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

export function useInactivityLogout(
  onTimeout: () => void | Promise<void>,
  timeoutMs: number = DEFAULT_INACTIVITY_TIMEOUT_MS
) {
  const timeoutCallbackRef = useRef(onTimeout);

  useEffect(() => {
    timeoutCallbackRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const startTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        void timeoutCallbackRef.current();
      }, timeoutMs);
    };

    const handleActivity = () => {
      if (document.visibilityState === "hidden") return;
      startTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startTimer();
      }
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    startTimer();
    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [timeoutMs]);
}

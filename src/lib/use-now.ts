"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
};
const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerSnapshot = () => null;

/**
 * The current time (minute precision) on the client, and null during prerendering.
 * Keeps time-dependent UI (greetings, "today") out of the static shell.
 */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return minute === null ? null : new Date(minute);
}

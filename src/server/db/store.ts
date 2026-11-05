import "server-only";

import { generateSeed } from "./seed";
import type { Database } from "./types";

/**
 * Per-session, in-memory data store.
 *
 * Each signed-in session gets its own deep copy of the seeded dataset, so one visitor's
 * transfers and card freezes never leak into another's. The map lives on globalThis so it
 * survives hot reloads in development. It is bounded (LRU) to keep memory flat.
 *
 * Trade-off: on serverless platforms an instance can be recycled, which resets a session's
 * data back to the seed. Repositories are the only callers, so swapping this module for a
 * KV store (e.g. Redis) would not touch services or route handlers.
 */

const MAX_SESSIONS = 500;

type StoreState = {
  baseDay: string | null;
  base: Database | null;
  sessions: Map<string, Database>;
};

const globalForStore = globalThis as typeof globalThis & { __ledgerlyStore?: StoreState };
const state: StoreState = (globalForStore.__ledgerlyStore ??= {
  baseDay: null,
  base: null,
  sessions: new Map(),
});

function baseDataset(now: Date): Database {
  const day = now.toISOString().slice(0, 10);
  if (!state.base || state.baseDay !== day) {
    state.base = generateSeed({ now });
    state.baseDay = day;
  }
  return state.base;
}

export function getDatabase(sessionId: string, now = new Date()): Database {
  const existing = state.sessions.get(sessionId);
  if (existing) {
    // Refresh LRU position.
    state.sessions.delete(sessionId);
    state.sessions.set(sessionId, existing);
    return existing;
  }
  const db = structuredClone(baseDataset(now));
  state.sessions.set(sessionId, db);
  if (state.sessions.size > MAX_SESSIONS) {
    const oldest = state.sessions.keys().next().value;
    if (oldest) state.sessions.delete(oldest);
  }
  return db;
}

export function dropDatabase(sessionId: string): void {
  state.sessions.delete(sessionId);
}

/** Test helper: reset everything. */
export function resetStore(): void {
  state.base = null;
  state.baseDay = null;
  state.sessions.clear();
}

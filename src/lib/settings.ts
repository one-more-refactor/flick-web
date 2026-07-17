// Debounced, queued persistence of user settings (wpm/theme) via PATCH
// /api/auth/me. Changes made in quick succession are merged into one PATCH;
// a failed PATCH re-queues the batch (newer values win) and retries once the
// backoff elapses. UI never waits on this — settings apply locally first.

import * as api from './api';
import type { Settings } from './api';

type Pending = Partial<Settings>;

let pending: Pending = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight = false;

export function queueSettings(patch: Pending, delayMs = 2000): void {
  pending = { ...pending, ...patch };
  schedule(delayMs);
}

function schedule(delayMs: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), delayMs);
}

async function flush(): Promise<void> {
  timer = null;
  if (inflight) {
    schedule(500); // a PATCH is on the wire — try again right after
    return;
  }
  const batch = pending;
  pending = {};
  if (batch.wpm === undefined && batch.theme === undefined) return;
  inflight = true;
  try {
    await api.updateMe({ settings: batch });
  } catch {
    // keep the batch, but let anything queued meanwhile override it
    pending = { ...batch, ...pending };
    schedule(5000);
  } finally {
    inflight = false;
  }
}

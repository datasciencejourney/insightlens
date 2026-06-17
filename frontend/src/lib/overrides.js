/*
 * Overrides store
 * ---------------
 * Tiny per-device "memory" backed by localStorage.  Each entry is
 *   { hash, label, count, updatedAt }
 *
 *   - When the user taps an alternate chip, we bump the count for the
 *     (hash, label) pair.  Once `count >= TEACH_THRESHOLD` we promote
 *     that label to the primary chip the next time we see a visually
 *     similar crop.
 *   - The "Teach the lens" button stores an entry with count
 *     already at the threshold (one-shot teach).
 *
 * Visual similarity uses Hamming distance on the 64-bit aHash.  An empirical
 * value of 12 bits is the sweet spot — close enough that the same object
 * under different lighting still matches, loose enough that obviously
 * different scenes do not collide.
 */
import { hamming } from "./phash";

const KEY = "il.overrides";
const MAX_ENTRIES = 120;
const MATCH_DISTANCE = 4;            // out of 64 bits
export const TEACH_THRESHOLD = 3;     // taps required to lock-in a label

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(arr) {
  try {
    // LRU eviction by updatedAt
    if (arr.length > MAX_ENTRIES) {
      arr.sort((a, b) => b.updatedAt - a.updatedAt);
      arr.length = MAX_ENTRIES;
    }
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // quota exceeded — silently drop the oldest half and retry once
    try {
      arr.sort((a, b) => b.updatedAt - a.updatedAt);
      arr.length = Math.floor(MAX_ENTRIES / 2);
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch { /* give up */ }
  }
}

/** find the strongest stored label for a given hash (or null) */
export function lookup(hash) {
  if (!hash) return null;
  const arr = load();
  let best = null;
  let bestDist = Infinity;
  for (const e of arr) {
    const d = hamming(hash, e.hash);
    if (d <= MATCH_DISTANCE && d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  if (!best) return null;
  return { ...best, distance: bestDist };
}

/** record (or reinforce) a label for a given hash */
export function reinforce(hash, label) {
  if (!hash || !label) return null;
  const arr = load();
  // try to find a close-enough existing entry FOR THIS LABEL
  let entry = arr.find(e => e.label === label && hamming(e.hash, hash) <= MATCH_DISTANCE);
  if (entry) {
    entry.count = (entry.count || 1) + 1;
    entry.updatedAt = Date.now();
    // also nudge the stored hash slightly toward the new fingerprint:
    // keep the original — simpler and avoids drift.
  } else {
    entry = { hash, label, count: 1, updatedAt: Date.now() };
    arr.push(entry);
  }
  save(arr);
  return entry;
}

/** force-add a label at the teach threshold — the "Teach" button uses this */
export function teach(hash, label) {
  if (!hash || !label) return null;
  const arr = load();
  // drop any other label for a near-identical hash so the new one wins
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].label !== label && hamming(arr[i].hash, hash) <= MATCH_DISTANCE) {
      arr.splice(i, 1);
    }
  }
  let entry = arr.find(e => e.label === label && hamming(e.hash, hash) <= MATCH_DISTANCE);
  if (entry) {
    entry.count = Math.max(entry.count || 1, TEACH_THRESHOLD);
    entry.updatedAt = Date.now();
  } else {
    entry = { hash, label, count: TEACH_THRESHOLD, updatedAt: Date.now() };
    arr.push(entry);
  }
  save(arr);
  return entry;
}

export function listAll() {
  return load().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function remove(hash, label) {
  const arr = load().filter(e => !(e.hash === hash && e.label === label));
  save(arr);
}

export function clearAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

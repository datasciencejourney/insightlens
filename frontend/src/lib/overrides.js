import { hamming } from "./phash";

const KEY = "il.overrides";
const MAX_ENTRIES = 120;
const MATCH_DISTANCE = 4;
export const TEACH_THRESHOLD = 3;

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
    if (arr.length > MAX_ENTRIES) {
      arr.sort((a, b) => b.updatedAt - a.updatedAt);
      arr.length = MAX_ENTRIES;
    }
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    try {
      arr.sort((a, b) => b.updatedAt - a.updatedAt);
      arr.length = Math.floor(MAX_ENTRIES / 2);
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch {}
  }
}

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

export function reinforce(hash, label) {
  if (!hash || !label) return null;
  const arr = load();
  let entry = arr.find(e => e.label === label && hamming(e.hash, hash) <= MATCH_DISTANCE);
  if (entry) {
    entry.count = (entry.count || 1) + 1;
    entry.updatedAt = Date.now();
  } else {
    entry = { hash, label, count: 1, updatedAt: Date.now() };
    arr.push(entry);
  }
  save(arr);
  return entry;
}

export function teach(hash, label) {
  if (!hash || !label) return null;
  const arr = load();
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
  try { localStorage.removeItem(KEY); } catch {}
}

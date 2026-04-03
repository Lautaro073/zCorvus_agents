import { createHash } from "crypto";

export const COMPACT_CACHE_POLICY_VERSION = "ctx-cache.v1";

function hashValue(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function normalizeWatermark(value) {
  if (typeof value !== "string") {
    return "jsonl:0";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "jsonl:0";
}

function toCacheKey(keyParts) {
  return hashValue(keyParts || {});
}

function evictIfNeeded(cache) {
  while (cache.store.size > cache.maxEntries) {
    const oldestKey = cache.store.keys().next().value;
    cache.store.delete(oldestKey);
  }
}

export function createCompactQueryCache(options = {}) {
  const maxEntries = Number.isInteger(options.maxEntries) && options.maxEntries > 0
    ? options.maxEntries
    : 256;

  return {
    policyVersion: COMPACT_CACHE_POLICY_VERSION,
    enabled: options.enabled !== false,
    maxEntries,
    store: new Map(),
    watermark: null,
    stats: {
      hits: 0,
      misses: 0,
      invalidations: 0,
    },
    lastInvalidationReason: null,
    lastInvalidatedAt: null,
  };
}

export function clearCompactQueryCache(cache, reason = "manual_clear") {
  cache.store.clear();
  cache.stats.invalidations += 1;
  cache.lastInvalidationReason = reason;
  cache.lastInvalidatedAt = new Date().toISOString();
}

export function setCompactCacheWatermark(cache, watermark) {
  const normalizedWatermark = normalizeWatermark(watermark);
  if (cache.watermark && cache.watermark !== normalizedWatermark) {
    clearCompactQueryCache(cache, "watermark_changed");
  }

  cache.watermark = normalizedWatermark;
}

export function resolveCompactCachedPayload(cache, input) {
  const normalizedWatermark = normalizeWatermark(input.watermark);
  const key = toCacheKey(input.keyParts);
  const keyFingerprint = hashValue(input.keyParts || {});

  if (!cache.enabled) {
    const payload = input.builder();
    const snapshotFingerprint = hashValue(payload);
    return {
      payload,
      cacheHit: false,
      cacheEnabled: false,
      cacheKey: key,
      keyFingerprint,
      snapshotFingerprint,
      watermark: normalizedWatermark,
      invalidated: false,
    };
  }

  const watermarkChanged = cache.watermark && cache.watermark !== normalizedWatermark;
  setCompactCacheWatermark(cache, normalizedWatermark);

  const existing = cache.store.get(key);
  if (existing) {
    cache.stats.hits += 1;
    return {
      payload: existing.payload,
      cacheHit: true,
      cacheEnabled: true,
      cacheKey: key,
      keyFingerprint,
      snapshotFingerprint: existing.snapshotFingerprint,
      watermark: normalizedWatermark,
      invalidated: watermarkChanged,
    };
  }

  const payload = input.builder();
  const snapshotFingerprint = hashValue(payload);
  cache.store.set(key, {
    payload,
    snapshotFingerprint,
    createdAt: new Date().toISOString(),
  });
  evictIfNeeded(cache);
  cache.stats.misses += 1;

  return {
    payload,
    cacheHit: false,
    cacheEnabled: true,
    cacheKey: key,
    keyFingerprint,
    snapshotFingerprint,
    watermark: normalizedWatermark,
    invalidated: watermarkChanged,
  };
}

export function annotateSnapshotCacheMeta(snapshot, cacheResult) {
  const readAudit = {
    ...(snapshot.readAudit || {}),
    cacheEnabled: cacheResult.cacheEnabled,
    cacheHit: cacheResult.cacheHit,
    cacheKey: cacheResult.cacheKey,
    cacheKeyFingerprint: cacheResult.keyFingerprint,
    cacheWatermark: cacheResult.watermark,
    cacheInvalidated: cacheResult.invalidated,
  };

  return {
    ...snapshot,
    snapshotFingerprint: cacheResult.snapshotFingerprint,
    readAudit,
  };
}

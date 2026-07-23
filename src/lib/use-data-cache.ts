"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global in-memory cache for client session
const globalCache = new Map<string, CacheEntry<any>>();

// Cache listeners for reactive updates across components
type Listener = () => void;
const cacheListeners = new Map<string, Set<Listener>>();

function subscribe(key: string, listener: Listener) {
  if (!cacheListeners.has(key)) {
    cacheListeners.set(key, new Set());
  }
  cacheListeners.get(key)!.add(listener);
  return () => {
    const set = cacheListeners.get(key);
    if (set) {
      set.delete(listener);
      if (set.size === 0) cacheListeners.delete(key);
    }
  };
}

function notify(key: string) {
  const listeners = cacheListeners.get(key);
  if (listeners) {
    listeners.forEach((fn) => fn());
  }
}

export interface UseDataCacheOptions<T> {
  ttlMs?: number; // Time-to-live in ms before considering stale (default 60000ms = 1 min)
  enabled?: boolean;
}

export function invalidateCache(keyPrefix?: string) {
  if (!keyPrefix) {
    globalCache.clear();
    cacheListeners.forEach((_, key) => notify(key));
    return;
  }
  for (const key of globalCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      globalCache.delete(key);
      notify(key);
    }
  }
}

export function useDataCache<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseDataCacheOptions<T> = {}
) {
  const { ttlMs = 60000, enabled = true } = options;

  const cached = key ? globalCache.get(key) : undefined;
  const initialData = cached ? (cached.data as T) : null;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!cached && Boolean(key && enabled));
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const performFetch = useCallback(
    async (isBackground = false) => {
      if (!key || !enabled) return;

      if (!isBackground) {
        setLoading(true);
      }
      setError(null);

      try {
        const freshData = await fetcherRef.current();
        globalCache.set(key, { data: freshData, timestamp: Date.now() });
        setData(freshData);
        notify(key);
      } catch (err: any) {
        const errMsg = err?.message || "Failed to load data";
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [key, enabled]
  );

  // Sync state when global cache changes
  useEffect(() => {
    if (!key) return;

    const handleCacheUpdate = () => {
      const entry = globalCache.get(key);
      if (entry) {
        setData(entry.data);
      }
    };

    return subscribe(key, handleCacheUpdate);
  }, [key]);

  // Main SWR logic: immediate cached data + background revalidate
  useEffect(() => {
    if (!key || !enabled) return;

    const currentCached = globalCache.get(key);
    if (currentCached) {
      setData(currentCached.data);
      setLoading(false);
      // Revalidate in background if stale
      const isStale = Date.now() - currentCached.timestamp > ttlMs;
      if (isStale) {
        performFetch(true);
      }
    } else {
      performFetch(false);
    }
  }, [key, enabled, ttlMs, performFetch]);

  const refetch = useCallback(async () => {
    await performFetch(false);
  }, [performFetch]);

  const mutate = useCallback(
    async (
      updater?: T | ((prev: T | null) => T),
      revalidate = true
    ) => {
      if (!key) return;

      if (updater !== undefined) {
        const newData =
          typeof updater === "function"
            ? (updater as (prev: T | null) => T)(data)
            : updater;
        globalCache.set(key, { data: newData, timestamp: Date.now() });
        setData(newData);
        notify(key);
      }

      if (revalidate) {
        await performFetch(true);
      }
    },
    [key, data, performFetch]
  );

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
  };
}

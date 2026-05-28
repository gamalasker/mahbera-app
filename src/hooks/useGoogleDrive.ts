import { useState, useCallback, useRef, useEffect } from 'react';
import type { Content } from '@/types';

const LS_SCRIPT_URL  = 'mahbera_drive_script_url';
const LS_LAST_SYNCED = 'mahbera_drive_last_synced';

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKwsXbJIGJnMlJqBPnDWiGjVcsmullClyDdusb-516jfG4QyqPYGF3XGwf_Zfy18yK8w/exec';

const getScriptUrl = () =>
  localStorage.getItem(LS_SCRIPT_URL) || DEFAULT_SCRIPT_URL;

export type DriveStatus = 'disconnected' | 'syncing' | 'connected' | 'error';

// ── Fingerprint: compare by count + IDs + latest timestamp ───────────────────
function fingerprint(contents: Content[]): string {
  if (contents.length === 0) return 'empty';
  const ids = contents.map(c => c.id).sort().join(',');
  const maxTs = contents.reduce(
    (m, c) => Math.max(m, new Date(c.updatedAt).getTime()), 0,
  );
  return `${contents.length}|${maxTs}|${ids}`;
}

// ── GET from Apps Script ──────────────────────────────────────────────────────
async function fetchFromScript(url: string): Promise<Content[]> {
  const res = await fetch(`${url}?t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('استجابة غير صالحة'); }
  if (!Array.isArray(data)) return [];
  return (data as any[]).map(item => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

// ── POST to Apps Script ───────────────────────────────────────────────────────
// No Content-Type header → browser treats as text/plain → simple request (no preflight).
// Apps Script processes the POST, then sends a 302 redirect to serve the response.
// If regular fetch fails (strict mobile browser), fall back to no-cors (fire-and-forget).
async function postToScript(url: string, contents: Content[]): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(contents),
      redirect: 'follow',
    });
  } catch {
    // Fallback for browsers that block cross-origin redirects
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(contents),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useGoogleDrive(onContentsLoaded: (contents: Content[]) => void) {
  const [status, setStatus] = useState<DriveStatus>('syncing');
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const s = localStorage.getItem(LS_LAST_SYNCED);
    return s ? new Date(s) : null;
  });
  const [error, setError]         = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(
    () => localStorage.getItem(LS_SCRIPT_URL) ?? DEFAULT_SCRIPT_URL,
  );

  const syncTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<Content[] | null>(null);
  const lastFpRef  = useRef<string>(''); // fingerprint of last known Drive state
  const onLoadRef  = useRef(onContentsLoaded);
  onLoadRef.current = onContentsLoaded;

  const POLL_INTERVAL = 15_000; // 15 seconds

  const markSynced = () => {
    const now = new Date();
    setLastSynced(now);
    localStorage.setItem(LS_LAST_SYNCED, now.toISOString());
  };

  // ── Pull: fetch from Drive, update local only if data changed ────────────
  const pullFromDrive = useCallback(async () => {
    const url = getScriptUrl();
    if (!url) return;
    try {
      const remote = await fetchFromScript(url);
      const fp = fingerprint(remote);
      if (fp !== lastFpRef.current) {
        lastFpRef.current = fp;
        if (remote.length > 0) onLoadRef.current(remote);
        markSynced();
      }
    } catch (e) {
      console.warn('Drive pull error:', e);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(pullFromDrive, POLL_INTERVAL);
  }, [pullFromDrive]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_SCRIPT_URL, trimmed);
    setScriptUrl(trimmed);
    setStatus('syncing');
    setError(null);
    try {
      const remote = await fetchFromScript(trimmed);
      lastFpRef.current = fingerprint(remote);
      setStatus('connected');
      if (remote.length > 0) onLoadRef.current(remote);
      markSynced();
      startPolling();
    } catch (err) {
      console.error('Drive connect error:', err);
      setStatus('error');
      setError('تعذر الاتصال. تأكد من رابط النشر وأن الوصول مضبوط على "الجميع".');
    }
  }, [startPolling]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    stopPolling();
    localStorage.removeItem(LS_SCRIPT_URL);
    localStorage.removeItem(LS_LAST_SYNCED);
    setScriptUrl('');
    setStatus('disconnected');
    setLastSynced(null);
    setError(null);
  }, [stopPolling]);

  // ── Push: debounced auto-sync ─────────────────────────────────────────────
  const scheduleSyncToDrive = useCallback((contents: Content[]) => {
    pendingRef.current = contents;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      if (!pendingRef.current) return;
      const currentUrl = getScriptUrl();
      if (!currentUrl) return;
      try {
        setStatus('syncing');
        await postToScript(currentUrl, pendingRef.current);
        lastFpRef.current = fingerprint(pendingRef.current);
        markSynced();
        setStatus('connected');
        setError(null);
      } catch (err) {
        console.error('Drive push error:', err);
        setStatus('connected'); // silent fail, retry on next change
      }
    }, 3000);
  }, []);

  // ── Manual pull now ───────────────────────────────────────────────────────
  const pullNow = useCallback(async () => {
    setStatus('syncing');
    await pullFromDrive();
    setStatus('connected');
  }, [pullFromDrive]);

  // ── Auto-connect on mount + cleanup ──────────────────────────────────────
  useEffect(() => {
    connect(getScriptUrl());
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pull when tab becomes visible (switching back from another app/tab) ──
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') pullFromDrive();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [pullFromDrive]);

  return { status, lastSynced, error, scriptUrl, connect, disconnect, scheduleSyncToDrive, pullNow };
}


const LS_SCRIPT_URL  = 'mahbera_drive_script_url';
const LS_LAST_SYNCED = 'mahbera_drive_last_synced';

// الرابط الافتراضي — يعمل تلقائياً على كل الأجهزة دون إعداد
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKwsXbJIGJnMlJqBPnDWiGjVcsmullClyDdusb-516jfG4QyqPYGF3XGwf_Zfy18yK8w/exec';

const getScriptUrl = () =>
  localStorage.getItem(LS_SCRIPT_URL) || DEFAULT_SCRIPT_URL;

export type DriveStatus = 'disconnected' | 'syncing' | 'connected' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Low-level helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET from Apps Script → returns the stored JSON array (or [] if not yet created).
 * Adds a timestamp param to bust cache on mobile browsers.
 */
async function fetchFromScript(url: string): Promise<Content[]> {
  const bustUrl = `${url}?t=${Date.now()}`;
  const res = await fetch(bustUrl, {
    method: 'GET',
    cache: 'no-store',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('استجابة غير صالحة من الخادم');
  }
  if (!Array.isArray(data)) return [];
  return (data as any[]).map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

/**
 * POST to Apps Script using mode:'no-cors' to avoid redirect/CORS issues on
 * mobile browsers (Safari, Chrome Android). The request reaches Apps Script
 * successfully; we just can't read the opaque response — which is fine for sync.
 */
async function postToScript(url: string, contents: Content[]): Promise<void> {
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(contents),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useGoogleDrive(onContentsLoaded: (contents: Content[]) => void) {
  const [status, setStatus] = useState<DriveStatus>('syncing');
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const s = localStorage.getItem(LS_LAST_SYNCED);
    return s ? new Date(s) : null;
  });
  const [error, setError]         = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(
    () => localStorage.getItem(LS_SCRIPT_URL) ?? DEFAULT_SCRIPT_URL,
  );

  const syncTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef  = useRef<Content[] | null>(null);
  // Track the last JSON string we pushed, to detect remote changes
  const lastPushed  = useRef<string>('');
  const onLoadRef   = useRef(onContentsLoaded);
  onLoadRef.current = onContentsLoaded;

  const POLL_INTERVAL = 30_000; // 30 seconds

  // ── Pull from Drive and update local if remote is different ──────────────
  const pullFromDrive = useCallback(async () => {
    const url = getScriptUrl();
    if (!url) return;
    try {
      const contents = await fetchFromScript(url);
      const remoteJson = JSON.stringify(contents);
      // Only update local state if remote data differs from what we last pushed
      if (remoteJson !== lastPushed.current && contents.length > 0) {
        lastPushed.current = remoteJson;
        onLoadRef.current(contents);
        const now = new Date();
        setLastSynced(now);
        localStorage.setItem(LS_LAST_SYNCED, now.toISOString());
      }
    } catch {
      // Silent — polling failure shouldn't disturb the user
    }
  }, []);

  // ── Start polling ─────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(pullFromDrive, POLL_INTERVAL);
  }, [pullFromDrive]);

  // ── Stop polling ──────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  // ── Connect with a script URL ─────────────────────────────────────────────
  const connect = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    localStorage.setItem(LS_SCRIPT_URL, trimmed);
    setScriptUrl(trimmed);
    setStatus('syncing');
    setError(null);

    try {
      const contents = await fetchFromScript(trimmed);
      setStatus('connected');
      if (contents.length > 0) {
        lastPushed.current = JSON.stringify(contents);
        onLoadRef.current(contents);
      }
      startPolling();
    } catch (err) {
      console.error('Drive connect error:', err);
      setStatus('error');
      setError('تعذر الاتصال. تأكد من رابط النشر وأن الوصول مضبوط على "الجميع".');
    }
  }, [startPolling]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    stopPolling();
    localStorage.removeItem(LS_SCRIPT_URL);
    localStorage.removeItem(LS_LAST_SYNCED);
    setScriptUrl('');
    setStatus('disconnected');
    setLastSynced(null);
    setError(null);
  }, [stopPolling]);

  // ── Debounced auto-sync (3 s after last change) ───────────────────────────
  const scheduleSyncToDrive = useCallback((contents: Content[]) => {
    pendingRef.current = contents;
    if (syncTimer.current) clearTimeout(syncTimer.current);

    syncTimer.current = setTimeout(async () => {
      if (!pendingRef.current) return;
      const currentUrl = getScriptUrl();
      if (!currentUrl) return;

      try {
        setStatus('syncing');
        const json = JSON.stringify(pendingRef.current);
        await postToScript(currentUrl, pendingRef.current);
        // mode:'no-cors' returns an opaque response — treat send as success
        lastPushed.current = json; // remember what we pushed to avoid false pull
        const now = new Date();
        setLastSynced(now);
        localStorage.setItem(LS_LAST_SYNCED, now.toISOString());
        setStatus('connected');
        setError(null);
      } catch (err) {
        // Network-level failure (offline, DNS, etc.)
        console.error('Drive sync error:', err);
        // Don't show error for network issues — retry on next change
        setStatus('connected');
      }
    }, 3000);
  }, []);

  // ── Auto-connect on mount + cleanup on unmount ────────────────────────────
  useEffect(() => {
    connect(getScriptUrl());
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync when tab becomes visible again (e.g. switching device → tab) ────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') pullFromDrive();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pullFromDrive]);

  return { status, lastSynced, error, scriptUrl, connect, disconnect, scheduleSyncToDrive };
}

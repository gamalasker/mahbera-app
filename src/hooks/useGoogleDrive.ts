import { useState, useCallback, useRef, useEffect } from 'react';
import type { Content } from '@/types';

const LS_SCRIPT_URL  = 'mahbera_drive_script_url';
const LS_LAST_SYNCED = 'mahbera_drive_last_synced';

const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzKwsXbJIGJnMlJqBPnDWiGjVcsmullClyDdusb-516jfG4QyqPYGF3XGwf_Zfy18yK8w/exec';

const POLL_MS  = 10_000; // 10 s between polls
const PUSH_MS  = 2_000;  // 2 s debounce before push

const getUrl = () => localStorage.getItem(LS_SCRIPT_URL) || DEFAULT_SCRIPT_URL;

export type DriveStatus = 'disconnected' | 'syncing' | 'connected' | 'error';

// ── fingerprint: sorted "id:ts" pairs ────────────────────────────────────────
function fp(items: Content[]): string {
  if (!items.length) return '';
  return items
    .map(c => `${c.id}:${new Date(c.updatedAt).getTime()}`)
    .sort()
    .join('|');
}

// ── merge: union of local+remote, newer updatedAt wins per ID ────────────────
function smartMerge(local: Content[], remote: Content[]): Content[] {
  if (!remote.length) return local;
  if (!local.length)  return remote;
  const map = new Map<string, Content>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    const ex = map.get(item.id);
    if (!ex || new Date(item.updatedAt) > new Date(ex.updatedAt))
      map.set(item.id, item);
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ── GET ───────────────────────────────────────────────────────────────────────
async function fetchRemote(url: string): Promise<Content[]> {
  const res = await fetch(`${url}?t=${Date.now()}`, {
    method: 'GET',
    cache:  'no-store',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { return []; }
  if (!Array.isArray(data)) return [];
  return (data as any[]).map(item => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

// ── POST (fire-and-forget, no-cors = works on every browser/mobile) ───────────
function pushRemote(url: string, contents: Content[]): void {
  fetch(url, {
    method: 'POST',
    mode:   'no-cors',
    body:   JSON.stringify(contents),
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
export function useGoogleDrive(onLoad: (contents: Content[]) => void) {
  const [status, setStatus] = useState<DriveStatus>('syncing');
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const s = localStorage.getItem(LS_LAST_SYNCED);
    return s ? new Date(s) : null;
  });
  const [error,     setError]     = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(() => getUrl());

  const pushTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pollTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pending    = useRef<Content[] | null>(null);
  const localRef   = useRef<Content[]>([]);   // mirror of current contents
  const remoteFpRef = useRef('');              // fp of last known Drive state
  const onLoadRef  = useRef(onLoad);
  onLoadRef.current = onLoad;

  // ── helpers ─────────────────────────────────────────────────────────────────
  const markSynced = useCallback(() => {
    const now = new Date();
    setLastSynced(now);
    localStorage.setItem(LS_LAST_SYNCED, now.toISOString());
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current)  { clearInterval(pollTimer.current);  pollTimer.current  = null; }
    if (retryTimer.current) { clearTimeout(retryTimer.current);  retryTimer.current = null; }
  }, []);

  // ── pull ─────────────────────────────────────────────────────────────────────
  const pull = useCallback(async () => {
    const url = getUrl();
    try {
      const remote = await fetchRemote(url);
      const rfp = fp(remote);
      // Always apply if Drive fingerprint changed
      if (rfp !== remoteFpRef.current) {
        remoteFpRef.current = rfp;
        const merged = smartMerge(localRef.current, remote);
        onLoadRef.current(merged);
        markSynced();
        // If merged has more items than remote (local had items not in Drive), push back
        if (merged.length > remote.length) {
          pushRemote(url, merged);
        }
      }
      setError(null);
      setStatus('connected');
    } catch {
      // silent — poll will retry
    }
  }, [markSynced]);

  // ── start polling ─────────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(pull, POLL_MS);
  }, [pull]);

  // ── connect ───────────────────────────────────────────────────────────────────
  const connect = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_SCRIPT_URL, trimmed);
    setScriptUrl(trimmed);
    setStatus('syncing');
    setError(null);
    stopPolling();
    startPolling(); // start polling immediately so retries happen even if initial fails

    try {
      const remote = await fetchRemote(trimmed);
      remoteFpRef.current = fp(remote);
      const merged = smartMerge(localRef.current, remote);
      onLoadRef.current(merged);
      // If local had items not in Drive, push them
      if (merged.length > remote.length) {
        pushRemote(trimmed, merged);
      }
      markSynced();
      setStatus('connected');
    } catch (err) {
      console.error('Drive connect error:', err);
      setStatus('error');
      setError('تعذر الاتصال بالسيرفر، سيتم إعادة المحاولة تلقائياً كل 10 ثواني');
      // polling already running — it will self-heal on next tick
    }
  }, [startPolling, stopPolling, markSynced]);

  // ── disconnect ────────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    stopPolling();
    localStorage.removeItem(LS_SCRIPT_URL);
    localStorage.removeItem(LS_LAST_SYNCED);
    remoteFpRef.current = '';
    setScriptUrl('');
    setStatus('disconnected');
    setLastSynced(null);
    setError(null);
  }, [stopPolling]);

  // ── push (debounced) ──────────────────────────────────────────────────────────
  const scheduleSyncToDrive = useCallback((contents: Content[]) => {
    localRef.current = contents;
    pending.current  = contents;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      if (!pending.current) return;
      const url = getUrl();
      if (!url) return;
      setStatus('syncing');
      pushRemote(url, pending.current);
      // Optimistic: mark synced immediately (no-cors = fire-and-forget)
      remoteFpRef.current = fp(pending.current); // prevent pull from overwriting what we just pushed
      markSynced();
      setStatus('connected');
    }, PUSH_MS);
  }, [markSynced]);

  // ── manual pull ───────────────────────────────────────────────────────────────
  const pullNow = useCallback(async () => {
    setStatus('syncing');
    remoteFpRef.current = ''; // force apply even if same fp
    await pull();
  }, [pull]);

  // ── mount ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    connect(getUrl());
    return () => {
      if (pushTimer.current)  clearTimeout(pushTimer.current);
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── visibility: pull when tab/app becomes active ──────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        remoteFpRef.current = ''; // force re-check
        pull();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [pull]);

  return { status, lastSynced, error, scriptUrl, connect, disconnect, scheduleSyncToDrive, pullNow };
}
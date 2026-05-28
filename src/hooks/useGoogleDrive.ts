import { useState, useCallback, useRef, useEffect } from 'react';
import type { Content } from '@/types';

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

/** GET from Apps Script → returns the stored JSON array (or [] if not yet created) */
async function fetchFromScript(url: string): Promise<Content[]> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return (data as any[]).map((item) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }));
}

/**
 * POST to Apps Script – body is plain text (avoids CORS preflight).
 * Apps Script receives it in e.postData.contents.
 */
async function postToScript(url: string, contents: Content[]): Promise<void> {
  // Sending without Content-Type makes the browser treat it as text/plain,
  // which is a "simple request" and skips the CORS preflight OPTIONS call.
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(contents),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  const pendingRef = useRef<Content[] | null>(null);
  const onLoadRef  = useRef(onContentsLoaded);
  onLoadRef.current = onContentsLoaded;

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
        onLoadRef.current(contents);
      }
    } catch (err) {
      console.error('Drive connect error:', err);
      setStatus('error');
      setError('تعذر الاتصال. تأكد من رابط النشر وأن الوصول مضبوط على "الجميع".');
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    localStorage.removeItem(LS_SCRIPT_URL);
    localStorage.removeItem(LS_LAST_SYNCED);
    setScriptUrl('');
    setStatus('disconnected');
    setLastSynced(null);
    setError(null);
  }, []);

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
        await postToScript(currentUrl, pendingRef.current);
        const now = new Date();
        setLastSynced(now);
        localStorage.setItem(LS_LAST_SYNCED, now.toISOString());
        setStatus('connected');
        setError(null);
      } catch (err) {
        console.error('Drive sync error:', err);
        setStatus('error');
        setError('فشل المزامنة مع جوجل درايف');
      }
    }, 3000);
  }, []);

  // ── Auto-connect on mount (uses saved URL or default) ───────────────────
  useEffect(() => {
    connect(getScriptUrl());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, lastSynced, error, scriptUrl, connect, disconnect, scheduleSyncToDrive };
}

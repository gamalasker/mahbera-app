import { useState, useCallback, useRef, useEffect } from 'react';
import type { Content, Folder } from '@/types';

const LS_LAST_SYNCED = 'mahbera_drive_last_synced';

const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwkp9UwXAYvZmzWehu1FkWrTRxB5CeXSv_8DrLbhS_9MUvMGFSq2hNNl4Le1-J-jQ2s6Q/exec';

const POLL_MS  = 10_000;
const PUSH_MS  = 2_000;

// الاعتماد حصرياً على الرابط المدمج لتلافي تخزين الروابط القديمة على الموبايل
const getUrl = () => DEFAULT_SCRIPT_URL;

export type DriveStatus = 'disconnected' | 'syncing' | 'connected' | 'error';

export interface DriveData {
  contents: Content[];
  folders: Folder[];
}

// ── fingerprint (لمعرفة التغييرات) ──────────────────────────────────────────
function fp(data: DriveData): string {
  const contentsFingerprint = data.contents
    .map(c => `${c.id}:${new Date(c.updatedAt).getTime()}`)
    .sort()
    .join('|');
  const foldersFingerprint = data.folders
    .map(f => `${f.id}:${new Date(f.updatedAt).getTime()}`)
    .sort()
    .join('|');
  return `${contentsFingerprint}#${foldersFingerprint}`;
}

// ── دمج ذكي (البيانات الأحدث تفوز) ──────────────────────────────────────────
function mergeByUpdatedAt<T extends { id: string; updatedAt: Date }>(local: T[], remote: T[]): T[] {
  if (!remote.length) return local;
  if (!local.length) return remote;
  const map = new Map<string, T>();
  for (const item of remote) map.set(item.id, item);
  for (const item of local) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function smartMerge(local: DriveData, remote: DriveData): DriveData {
  const map = new Map<string, Content>();
  for (const item of remote.contents) map.set(item.id, item);
  for (const item of local.contents) {
    const ex = map.get(item.id);
    if (!ex || new Date(item.updatedAt) > new Date(ex.updatedAt))
      map.set(item.id, item);
  }
  return {
    contents: Array.from(map.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    folders: mergeByUpdatedAt(local.folders, remote.folders)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
async function fetchRemote(url: string): Promise<DriveData> {
  const res = await fetch(`${url}?t=${Date.now()}`, {
    method: 'GET',
    cache:  'no-store',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  
  // إذا طلب تسجيل الدخول، يعني الصلاحيات ليست "الجميع"
  if (text.includes('<html') || text.includes('Sign in') || text.includes('تسجيل الدخول')) {
    throw new Error('AUTH_REQUIRED');
  }

  let data: unknown;
  try { data = JSON.parse(text); } catch { return { contents: [], folders: [] }; }

  const rawContents = Array.isArray(data)
    ? data
    : Array.isArray((data as DriveData)?.contents)
      ? (data as DriveData).contents
      : [];
  const rawFolders = !Array.isArray(data) && Array.isArray((data as DriveData)?.folders)
    ? (data as DriveData).folders
    : [];

  return {
    contents: rawContents.map(item => ({
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    })),
    folders: rawFolders.map(item => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })),
  };
}

// ── POST ──────────────────────────────────────────────────────────────────────
async function pushRemote(url: string, data: DriveData): Promise<void> {
  // استخدام fetch بسيط بدون تحديد Content-Type صريح كـ application/json لتجنب CORS Preflight.
  // الديفولت في fetch مع string body هو text/plain.
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      // follow redirect لأن سيرفرات جوجل ترد بـ 302
      redirect: 'follow',
    });
  } catch {
    // إذا فشل (بسبب حماية المتصفح)، نجرب وضع no-cors كخيار أخير
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(data),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function useGoogleDrive(onLoad: (data: DriveData) => void) {
  const [status, setStatus] = useState<DriveStatus>('syncing');
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const s = localStorage.getItem(LS_LAST_SYNCED);
    return s ? new Date(s) : null;
  });
  const [error,     setError]     = useState<string | null>(null);

  const pushTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pollTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pending    = useRef<DriveData | null>(null);
  const localRef   = useRef<DriveData>({ contents: [], folders: [] });
  const remoteFpRef = useRef('');
  const onLoadRef  = useRef(onLoad);
  onLoadRef.current = onLoad;

  const markSynced = useCallback(() => {
    const now = new Date();
    setLastSynced(now);
    localStorage.setItem(LS_LAST_SYNCED, now.toISOString());
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const pull = useCallback(async () => {
    const url = getUrl();
    try {
      const remote = await fetchRemote(url);
      const rfp = fp(remote);
      if (rfp !== remoteFpRef.current) {
        remoteFpRef.current = rfp;
        const merged = smartMerge(localRef.current, remote);
        onLoadRef.current(merged);
        markSynced();
        if (fp(merged) !== rfp) {
          pushRemote(url, merged);
        }
      }
      setError(null);
      setStatus('connected');
    } catch (e: any) {
      if (e.message === 'AUTH_REQUIRED') {
        setStatus('error');
        setError('تعذر المزامنة: يرجى نشر Apps Script بصلاحية "الجميع" (Anyone) ليعمل على المحمول.');
      }
    }
  }, [markSynced]);

  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(pull, POLL_MS);
  }, [pull]);

  const connect = useCallback(async () => {
    const trimmed = getUrl().trim();
    if (!trimmed) return;
    setStatus('syncing');
    setError(null);
    stopPolling();
    startPolling();

    try {
      const remote = await fetchRemote(trimmed);
      remoteFpRef.current = fp(remote);
      const merged = smartMerge(localRef.current, remote);
      onLoadRef.current(merged);
      if (fp(merged) !== fp(remote)) {
        pushRemote(trimmed, merged);
      }
      markSynced();
      setStatus('connected');
    } catch (err: any) {
      console.error('Drive connect error:', err);
      setStatus('error');
      if (err.message === 'AUTH_REQUIRED') {
        setError('تأكد من نشر السكربت واختيار "Who has access: Anyone" ليعمل بدون تسجيل دخول.');
      } else {
        setError('لا يوجد اتصال. تأكد من الإنترنت أو سيتم إعادة المحاولة تلقائياً.');
      }
    }
  }, [startPolling, stopPolling, markSynced]);

  const disconnect = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    stopPolling();
    localStorage.removeItem(LS_LAST_SYNCED);
    remoteFpRef.current = '';
    setStatus('disconnected');
    setLastSynced(null);
    setError(null);
  }, [stopPolling]);

  const scheduleSyncToDrive = useCallback((data: DriveData) => {
    localRef.current = data;
    pending.current = data;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      if (!pending.current) return;
      const url = getUrl();
      if (!url) return;
      setStatus('syncing');
      pushRemote(url, pending.current);
      remoteFpRef.current = fp(pending.current);
      markSynced();
      setStatus('connected');
    }, PUSH_MS);
  }, [markSynced]);

  const pullNow = useCallback(async () => {
    setStatus('syncing');
    remoteFpRef.current = ''; // force pull
    await pull();
  }, [pull]);

  useEffect(() => {
    connect();
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      stopPolling();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        remoteFpRef.current = '';
        pull();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [pull]);

  return { status, lastSynced, error, connect, disconnect, scheduleSyncToDrive, pullNow };
}
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Content } from '@/types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FILE_NAME = 'mahbera_data.json';

const LS_TOKEN = 'mahbera_drive_token';
const LS_EXPIRY = 'mahbera_drive_token_expiry';
const LS_FILE_ID = 'mahbera_drive_file_id';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export type DriveStatus = 'disconnected' | 'connecting' | 'syncing' | 'connected' | 'error';

// ─── Script Loader ────────────────────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ─── Drive API helpers (raw fetch so we avoid gapi upload quirks) ─────────────
async function driveUpload(
  token: string,
  body: string,
  fileId?: string | null,
): Promise<string> {
  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      },
    );
    if (!res.ok) throw new Error(`Drive PATCH failed: ${res.status}`);
    return fileId;
  }

  // Multipart create
  const boundary = 'mahbera_mp_boundary';
  const multipart =
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    body +
    `\r\n--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipart,
    },
  );
  if (!res.ok) throw new Error(`Drive POST failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGoogleDrive(onContentsLoaded: (contents: Content[]) => void) {
  const [status, setStatus] = useState<DriveStatus>('disconnected');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const expiryRef = useRef<number>(0);
  const fileIdRef = useRef<string | null>(null);
  const tokenClientRef = useRef<any>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Content[] | null>(null);
  const onLoadRef = useRef(onContentsLoaded);
  onLoadRef.current = onContentsLoaded; // always up-to-date

  const isTokenValid = () =>
    !!tokenRef.current && Date.now() < expiryRef.current - 60_000;

  // ── Initialize gapi ──────────────────────────────────────────────────────
  const initGapi = useCallback(async () => {
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise<void>((resolve) => window.gapi.load('client', resolve));
    if (!window.gapi.client.drive) {
      await window.gapi.client.load(
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
      );
    }
  }, []);

  // ── Load from Drive ───────────────────────────────────────────────────────
  const loadFromDrive = useCallback(async (): Promise<Content[] | null> => {
    const listResp = await window.gapi.client.drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      fields: 'files(id,modifiedTime)',
      spaces: 'drive',
      pageSize: 1,
    });

    const files: any[] = listResp.result.files ?? [];
    if (files.length === 0) return null;

    fileIdRef.current = files[0].id;
    localStorage.setItem(LS_FILE_ID, files[0].id);

    const getResp = await window.gapi.client.drive.files.get({
      fileId: files[0].id,
      alt: 'media',
    });

    const raw = typeof getResp.body === 'string' ? getResp.body : JSON.stringify(getResp.result);
    const parsed: any[] = JSON.parse(raw);

    setLastSynced(new Date(files[0].modifiedTime));
    return parsed.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  }, []);

  // ── After token is obtained: set token, load from Drive ──────────────────
  const activateToken = useCallback(
    async (token: string, expiry: number) => {
      tokenRef.current = token;
      expiryRef.current = expiry;
      window.gapi.client.setToken({ access_token: token });
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_EXPIRY, String(expiry));

      setStatus('syncing');
      try {
        const contents = await loadFromDrive();
        setStatus('connected');
        setError(null);
        if (contents) {
          onLoadRef.current(contents);
        }
      } catch (err) {
        console.error('Drive load error:', err);
        // Connected but no file yet – that's fine
        setStatus('connected');
        setError(null);
      }
    },
    [loadFromDrive],
  );

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    if (!CLIENT_ID) {
      setError('لم يتم تكوين معرف عميل جوجل. أضف VITE_GOOGLE_CLIENT_ID في ملف .env.local');
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      await initGapi();
      await loadScript('https://accounts.google.com/gsi/client');

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            setStatus('error');
            setError('فشل تسجيل الدخول: ' + resp.error);
            return;
          }
          const expiry = Date.now() + (resp.expires_in ?? 3600) * 1000;
          await activateToken(resp.access_token, expiry);
        },
      });

      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('signIn error:', err);
      setStatus('error');
      setError('فشل الاتصال بجوجل');
    }
  }, [initGapi, activateToken]);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    if (tokenRef.current && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(tokenRef.current, () => {});
    }
    tokenRef.current = null;
    expiryRef.current = 0;
    fileIdRef.current = null;
    if (syncTimer.current) clearTimeout(syncTimer.current);

    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EXPIRY);
    localStorage.removeItem(LS_FILE_ID);

    setStatus('disconnected');
    setLastSynced(null);
    setError(null);
  }, []);

  // ── Debounced auto-sync ───────────────────────────────────────────────────
  const scheduleSyncToDrive = useCallback(
    (contents: Content[]) => {
      if (!isTokenValid()) return;
      pendingRef.current = contents;

      if (syncTimer.current) clearTimeout(syncTimer.current);

      syncTimer.current = setTimeout(async () => {
        if (!pendingRef.current || !isTokenValid()) return;
        try {
          setStatus('syncing');
          const id = await driveUpload(
            tokenRef.current!,
            JSON.stringify(pendingRef.current),
            fileIdRef.current,
          );
          fileIdRef.current = id;
          localStorage.setItem(LS_FILE_ID, id);
          setLastSynced(new Date());
          setStatus('connected');
          setError(null);
        } catch (err) {
          console.error('Drive sync error:', err);
          setStatus('error');
          setError('فشل المزامنة مع جوجل درايف');
        }
      }, 3000);
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Auto-restore saved session on mount ───────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem(LS_TOKEN);
    const expiryStr = localStorage.getItem(LS_EXPIRY);
    const savedFileId = localStorage.getItem(LS_FILE_ID);

    if (!savedToken || !expiryStr) return;
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() >= expiry - 60_000) {
      // Expired — clean up
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_EXPIRY);
      return;
    }

    if (savedFileId) fileIdRef.current = savedFileId;

    initGapi()
      .then(() => activateToken(savedToken, expiry))
      .catch(() => signOut());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, lastSynced, error, signIn, signOut, scheduleSyncToDrive };
}

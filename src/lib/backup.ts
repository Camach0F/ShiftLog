import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useSyncExternalStore } from 'react';

import type { AppState } from './types';

/**
 * Backups live in the hidden app-data folder of the user's own Google Drive: only ShiftLog can
 * see that folder, and nothing goes through any other server.
 *
 * One-time setup in Google Cloud (see the project notes): enable the Drive API, configure the
 * consent screen, and create an OAuth client of type "Android" with the package name
 * es.jcamacho.shiftlog and the SHA-1 of the key that signs the release APK. No client id is
 * needed in the code: Google matches the app by package name and signing key.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'shiftlog-backup.json';
const META_KEY = 'shiftlog:backup-meta';
const API = 'https://www.googleapis.com';

type Meta = { enabled: boolean; lastSyncedAt: string | null; lastHash: string | null };

/** A backup found in Drive. `savedAt` identifies the version: it changes with every upload. */
export type Remote = { id: string; savedAt: string };

export type BackupState = {
  loaded: boolean;
  /** Google account signed in, or null */
  account: string | null;
  /** Back up automatically when the data changes */
  enabled: boolean;
  lastSyncedAt: string | null;
  /** Fingerprint of the data that Drive holds, to tell whether there is anything new to save */
  lastHash: string | null;
  /** Counts restores, so the auto-saver can mark the restored data as saved */
  restoreTick: number;
  busy: 'idle' | 'connecting' | 'saving' | 'restoring';
  /** A backup in Drive that this device did not write and that an upload would overwrite */
  conflict: Remote | null;
  error: string | null;
};

let state: BackupState = {
  loaded: false,
  account: null,
  enabled: false,
  lastSyncedAt: null,
  lastHash: null,
  restoreTick: 0,
  busy: 'idle',
  conflict: null,
  error: null,
};
let pendingRestore: string | null = null;
const listeners = new Set<() => void>();

function setState(next: Partial<BackupState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const useBackupState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const getBackupState = () => state;

/** Small fingerprint (djb2) of the serialized data. */
export function hashOf(json: string): string {
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  return `${json.length}:${h}`;
}

async function saveMeta() {
  const meta: Meta = { enabled: state.enabled, lastSyncedAt: state.lastSyncedAt, lastHash: state.lastHash };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
}

/** Explains a failure in words the user can act on. */
function describe(error: unknown): string {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'Este dispositivo no tiene los servicios de Google Play.';
    if (error.code === statusCodes.IN_PROGRESS) return 'Ya hay un inicio de sesión en curso.';
    return `Google no ha permitido el acceso (${error.code}). Comprueba la configuración de Google Cloud.`;
  }
  if (error instanceof Error && error.message.startsWith('drive:')) return 'No se pudo hablar con Drive. Revisa la conexión e inténtalo de nuevo.';
  return 'No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.';
}

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ scopes: [SCOPE] });
  configured = true;
}

/** Reads the saved choices and, if the user had connected, signs in again without asking. */
export async function initBackup(): Promise<void> {
  if (state.loaded) return;
  let meta: Meta = { enabled: false, lastSyncedAt: null, lastHash: null };
  try {
    meta = { ...meta, ...JSON.parse((await AsyncStorage.getItem(META_KEY)) ?? '{}') };
  } catch {
    // Unreadable choices: start disconnected.
  }
  setState({ loaded: true, enabled: meta.enabled, lastSyncedAt: meta.lastSyncedAt, lastHash: meta.lastHash });
  if (!meta.enabled) return;
  try {
    configure();
    const response = await GoogleSignin.signInSilently();
    if (response.type === 'success') setState({ account: response.data.user.email });
  } catch {
    // Offline or the session expired: the card offers to connect again.
  }
}

async function request(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const { accessToken } = await GoogleSignin.getTokens();
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401 && !retried) {
    await GoogleSignin.clearCachedAccessToken(accessToken);
    return request(path, init, true);
  }
  if (!res.ok) throw new Error(`drive:${res.status}`);
  return res;
}

async function findRemote(): Promise<Remote | null> {
  const query = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${FILE_NAME}' and trashed = false`,
    fields: 'files(id,appProperties)',
  });
  const { files } = await (await request(`/drive/v3/files?${query}`)).json();
  const file = files?.[0];
  return file ? { id: file.id, savedAt: file.appProperties?.savedAt ?? '' } : null;
}

async function upload(data: AppState, remote: Remote | null): Promise<string> {
  const savedAt = new Date().toISOString();
  const metadata = { name: FILE_NAME, appProperties: { savedAt }, ...(remote ? {} : { parents: ['appDataFolder'] }) };
  const boundary = `shiftlog${Date.now()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ app: 'shiftlog', savedAt, data })}\r\n` +
    `--${boundary}--`;
  await request(`/upload/drive/v3/files${remote ? `/${remote.id}` : ''}?uploadType=multipart`, {
    method: remote ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return savedAt;
}

/**
 * Uploads the data. If Drive holds a backup this device did not write, nothing is overwritten:
 * the conflict is reported so the user chooses (unless `overwrite` says so).
 */
export async function backupNow(data: AppState, overwrite = false): Promise<void> {
  if (!state.account || state.busy !== 'idle') return;
  setState({ busy: 'saving', error: null });
  try {
    const remote = await findRemote();
    if (remote && !overwrite && remote.savedAt !== state.lastSyncedAt) {
      setState({ conflict: remote });
      return;
    }
    const savedAt = await upload(data, remote);
    setState({ lastSyncedAt: savedAt, lastHash: hashOf(JSON.stringify(data)), conflict: null });
    await saveMeta();
  } catch (e) {
    setState({ error: describe(e) });
  } finally {
    setState({ busy: 'idle' });
  }
}

/** Downloads the backup from Drive; the caller replaces the app's data with it. */
export async function fetchBackup(): Promise<{ data: Record<string, any>; savedAt: string } | null> {
  if (!state.account || state.busy !== 'idle') return null;
  setState({ busy: 'restoring', error: null });
  try {
    const remote = await findRemote();
    if (!remote) {
      setState({ error: 'No hay ninguna copia en tu Drive.' });
      return null;
    }
    const backup = await (await request(`/drive/v3/files/${remote.id}?alt=media`)).json();
    if (backup?.app !== 'shiftlog' || typeof backup.data !== 'object') throw new Error('drive:format');
    return { data: backup.data, savedAt: remote.savedAt };
  } catch (e) {
    setState({ error: describe(e) });
    return null;
  } finally {
    setState({ busy: 'idle' });
  }
}

/** Call right after replacing the app's data with a downloaded backup: from then on, that data counts as saved. */
export function expectRestore(savedAt: string) {
  pendingRestore = savedAt;
  setState({ restoreTick: state.restoreTick + 1, conflict: null });
}

/** Marks the current data as the one Drive holds (used once a restore has been applied). */
export async function markRestoredAs(json: string) {
  if (pendingRestore === null) return;
  setState({ lastSyncedAt: pendingRestore, lastHash: hashOf(json) });
  pendingRestore = null;
  await saveMeta();
}

/** Signs in with Google, turns automatic backups on and looks for a backup that already exists. */
export async function connect(data: AppState): Promise<void> {
  if (state.busy !== 'idle') return;
  setState({ busy: 'connecting', error: null });
  try {
    configure();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return;
    setState({ account: response.data.user.email, enabled: true, lastSyncedAt: null, lastHash: null });
    await saveMeta();
  } catch (e) {
    setState({ error: describe(e) });
    return;
  } finally {
    setState({ busy: 'idle' });
  }
  await backupNow(data);
}

export async function setAutomatic(enabled: boolean): Promise<void> {
  setState({ enabled });
  await saveMeta();
}

export async function disconnect(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Already signed out.
  }
  setState({ account: null, enabled: false, lastSyncedAt: null, lastHash: null, conflict: null, error: null });
  await saveMeta();
}

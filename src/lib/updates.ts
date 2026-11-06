import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';
import { useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';

const REPO = 'Camach0F/ShiftLog';
/** Only APKs published on this repository's releases are ever downloaded. */
const DOWNLOAD_PREFIX = `https://github.com/${REPO}/releases/download/`;
const TIMEOUT_MS = 10000;

export const installedVersion = Constants.expoConfig?.version ?? '0.0.0';

export type Update = { version: string; notes: string; apkUrl: string; sizeMb: number };

export type UpdateState = {
  status: 'idle' | 'checking' | 'upToDate' | 'available' | 'error';
  update: Update | null;
  /** The user dismissed the notice for this session */
  dismissed: boolean;
};

let state: UpdateState = { status: 'idle', update: null, dismissed: false };
let lastCheckedAt = 0;
const listeners = new Set<() => void>();

function setState(next: Partial<UpdateState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const useUpdateState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const dismissUpdate = () => setState({ dismissed: true });

/** True when version a is newer than b ("1.10.0" > "1.9.2"). */
export function isNewer(a: string, b: string): boolean {
  const parts = (v: string) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/** Release notes arrive as Markdown; show them as plain text. */
const plainNotes = (body: string) =>
  body
    .replace(/\r/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/[*`]/g, '')
    .replace(/^- /gm, '• ')
    .trim()
    .slice(0, 600);

/** Asks GitHub for the latest release. Never throws: failures end in the "error" status. */
export async function checkForUpdate(): Promise<void> {
  if (state.status === 'checking') return;
  lastCheckedAt = Date.now();
  setState({ status: 'checking' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const release = await res.json();
    const version = String(release.tag_name ?? '').replace(/^v/, '');
    const asset = (release.assets ?? []).find(
      (a: { name: string; browser_download_url: string }) => a.name.endsWith('.apk') && a.browser_download_url.startsWith(DOWNLOAD_PREFIX),
    );
    if (version && asset && isNewer(version, installedVersion)) {
      setState({
        status: 'available',
        update: { version, notes: plainNotes(String(release.body ?? '')), apkUrl: asset.browser_download_url, sizeMb: Math.round(asset.size / 1048576) },
      });
    } else {
      setState({ status: 'upToDate', update: null });
    }
  } catch {
    setState({ status: 'error' });
  } finally {
    clearTimeout(timer);
  }
}

/** Checks again only if the last check is older than `maxAgeMs` (for when the app comes back to the foreground). */
export async function checkForUpdateIfStale(maxAgeMs: number): Promise<void> {
  if (Date.now() - lastCheckedAt >= maxAgeMs) await checkForUpdate();
}

/**
 * Downloads the APK and hands it to Android's installer, which asks the user to confirm. The new
 * version only installs over this one if it is signed with the same key.
 */
export async function downloadAndInstall(update: Update): Promise<void> {
  const dir = new Directory(Paths.cache, 'updates');
  if (dir.exists) dir.delete();
  dir.create();
  const apk = await File.downloadFileAsync(update.apkUrl, new File(dir, `ShiftLog-${update.version}.apk`));
  await startActivityAsync('android.intent.action.VIEW', {
    data: await getContentUriAsync(apk.uri),
    type: 'application/vnd.android.package-archive',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}

/** Installs an update from a button: tracks the download and explains a failure. */
export function useInstallUpdate() {
  const [downloading, setDownloading] = useState(false);
  const install = async (update: Update) => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAndInstall(update);
    } catch {
      Alert.alert('No se pudo actualizar', 'Revisa la conexión e inténtalo de nuevo, o descarga el APK desde GitHub.');
    } finally {
      setDownloading(false);
    }
  };
  return { downloading, install };
}

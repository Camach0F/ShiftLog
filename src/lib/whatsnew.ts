import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'shiftlog:last-seen-version';

/**
 * Whether to show the "what's new" popup. After an update the stored version differs from the
 * installed one. A version that did not track this yet (1.0.0) leaves nothing stored, so an
 * install with data in it counts as an update; an empty one is a fresh install and shows nothing.
 */
export function shouldShowWhatsNew(stored: string | null, installed: string, hasData: boolean, hasNotes: boolean): boolean {
  if (!hasNotes) return false;
  return stored === null ? hasData : stored !== installed;
}

export async function readLastSeenVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function writeLastSeenVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(KEY, version).catch(() => {});
}

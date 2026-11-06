import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessaging, subscribeToTopic, unsubscribeFromTopic } from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

/**
 * "New version" push notifications. The release workflow sends one message to the `updates` topic
 * of Firebase Cloud Messaging (scripts/notify-push.mjs); the app only subscribes to that topic, so
 * there is no server and no per-phone data kept anywhere. Android shows the message by itself when
 * the app is closed or in the background.
 */
const TOPIC = 'updates';
const ASKED_KEY = 'shiftlog:push-asked';

/** Asks for the notification permission (Android 13+) once; Android never shows the dialog again after two refusals. */
async function askPermissionOnce(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  if ((await AsyncStorage.getItem(ASKED_KEY)) !== null) return;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
}

/** Subscribes to the notices of new versions. Never throws (no Google Play services, no network...). */
export async function enableUpdatePush(): Promise<void> {
  try {
    await askPermissionOnce();
    await subscribeToTopic(getMessaging(), TOPIC);
  } catch (e) {
    console.warn('[push] could not subscribe', e);
  }
}

export async function disableUpdatePush(): Promise<void> {
  try {
    await unsubscribeFromTopic(getMessaging(), TOPIC);
  } catch (e) {
    console.warn('[push] could not unsubscribe', e);
  }
}

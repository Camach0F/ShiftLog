// Small icon of the push notifications: Android draws only the shape (alpha) of this image in the
// status bar. Without it the app icon is used, which shows up as a plain square.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

module.exports = function withNotificationIcon(config) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const drawable = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
      fs.mkdirSync(drawable, { recursive: true });
      fs.copyFileSync(path.join(cfg.modRequest.projectRoot, 'assets/notification-icon.png'), path.join(drawable, 'notification_icon.png'));
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      'com.google.firebase.messaging.default_notification_icon',
      '@drawable/notification_icon',
      'resource',
    );
    return cfg;
  });
};

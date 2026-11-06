// Sends the "new version" push notification to every phone subscribed to the `updates` topic of
// Firebase Cloud Messaging. Used by the release workflow, after the release is published.
//
// Environment: FIREBASE_SERVICE_ACCOUNT (the JSON key of a service account of the Firebase project,
// as a secret) and VERSION (e.g. 1.0.1). The app subscribes to the same topic (src/lib/push.ts).
// Run with `node scripts/notify-push.mjs [--dry-run]`.
import { createSign } from 'node:crypto';

const TOPIC = 'updates';
const { FIREBASE_SERVICE_ACCOUNT: raw, VERSION: version } = process.env;
const dryRun = process.argv.includes('--dry-run');

if (!version || (!raw && !dryRun)) {
  console.error('Missing VERSION or FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

const message = {
  topic: TOPIC,
  notification: {
    title: `ShiftLog V${version}`,
    body: 'Hay una actualización nueva. Toca para abrir la app e instalarla.',
  },
  android: { priority: 'HIGH' },
};

if (dryRun) {
  console.log(JSON.stringify({ message }, null, 2));
  process.exit(0);
}

const account = JSON.parse(raw);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

// A signed request for an access token (OAuth 2.0 service account flow), valid for the FCM scope.
const now = Math.floor(Date.now() / 1000);
const claims = {
  iss: account.client_email,
  scope: 'https://www.googleapis.com/auth/firebase.messaging',
  aud: account.token_uri ?? 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
};
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');

const tokenResponse = await fetch(claims.aud, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
});
if (!tokenResponse.ok) {
  console.error(`Could not get an access token: ${tokenResponse.status} ${await tokenResponse.text()}`);
  process.exit(1);
}
const { access_token: accessToken } = await tokenResponse.json();

const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
});
if (!res.ok) {
  console.error(`FCM answered ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log('Push notification sent.');

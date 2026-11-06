// Announces a release in a Discord channel through a webhook: an embed with the changes of the
// version (from src/lib/changelog.ts), a button to download the APK and, if set, a role mention.
//
// Environment: DISCORD_WEBHOOK_URL (secret), VERSION (e.g. 1.0.1), and optionally
// DISCORD_ROLE_ID (role to mention) and DISCORD_IMAGE_URL (image of the embed).
// Run with `node --experimental-strip-types scripts/announce-discord.mjs [--dry-run]`.
import { releaseFor } from '../src/lib/changelog.ts';

const { DISCORD_WEBHOOK_URL: webhook, VERSION: version, DISCORD_ROLE_ID: role, DISCORD_IMAGE_URL: image } = process.env;
const repo = 'https://github.com/Camach0F/ShiftLog';
const dryRun = process.argv.includes('--dry-run');

if (!version || (!webhook && !dryRun)) {
  console.error('Missing VERSION or DISCORD_WEBHOOK_URL.');
  process.exit(1);
}

const changes = releaseFor(version)?.changes ?? [];
const description = [
  changes.length > 0 ? changes.map((c) => `• ${c}`).join('\n') : 'Ya hay una versión nueva de ShiftLog.',
  'Puedes actualizar desde la propia app (Ajustes → Actualizaciones) o con el botón de abajo.',
].join('\n\n');

const payload = {
  ...(role && { content: `<@&${role}>` }),
  // Only the role given above can be mentioned, whatever the text says.
  allowed_mentions: role ? { roles: [role] } : { parse: [] },
  embeds: [
    {
      title: `ShiftLog V${version}`,
      url: `${repo}/releases/tag/v${version}`,
      description,
      color: 0x2f6bff,
      ...(image && { image: { url: image } }),
    },
  ],
  components: [
    {
      type: 1,
      components: [{ type: 2, style: 5, label: `Descargar V${version}`, url: `${repo}/releases/download/v${version}/ShiftLog.apk` }],
    },
  ],
};

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  // with_components lets a plain webhook send the (link) button.
  const res = await fetch(`${webhook}?with_components=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error(`Discord answered ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  console.log('Announced on Discord.');
}

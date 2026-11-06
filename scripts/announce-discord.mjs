// Announces a release in a Discord channel through a webhook: an embed with the changes of the
// version (from src/lib/changelog.ts), a button to download the APK and, if set, a role mention.
//
// Environment: DISCORD_WEBHOOK_URL (secret), VERSION (e.g. 1.0.1) and, as repository variables,
// DISCORD_ROLE_ID (the role to mention) and the ids of the custom emojis of the buttons:
// DISCORD_EMOJI_GITHUB, DISCORD_EMOJI_SPONSORS, DISCORD_EMOJI_PAYPAL, DISCORD_EMOJI_SHIFTLOG.
// DISCORD_IMAGE_URL can replace the image (the default is docs/discord-update.gif of this repository).
// Run with `node --experimental-strip-types scripts/announce-discord.mjs [--dry-run]`.
import { releaseFor } from '../src/lib/changelog.ts';
import { PAYPAL_URL, SPONSORS_URL } from '../src/lib/links.ts';

const { DISCORD_WEBHOOK_URL: webhook, VERSION: version } = process.env;
const { DISCORD_ROLE_ID: role, DISCORD_EMOJI_GITHUB, DISCORD_EMOJI_SPONSORS, DISCORD_EMOJI_PAYPAL, DISCORD_EMOJI_SHIFTLOG } = process.env;
const repo = 'https://github.com/Camach0F/ShiftLog';
const rawRepo = 'https://raw.githubusercontent.com/Camach0F/ShiftLog/main';
const dryRun = process.argv.includes('--dry-run');
const image = process.env.DISCORD_IMAGE_URL || `${rawRepo}/docs/discord-update.gif`;

// Better to fail with a clear message than to post an announcement without its mention or icons.
const required = { VERSION: version, DISCORD_ROLE_ID: role, DISCORD_EMOJI_GITHUB, DISCORD_EMOJI_SPONSORS, DISCORD_EMOJI_PAYPAL, DISCORD_EMOJI_SHIFTLOG };
if (!dryRun) required.DISCORD_WEBHOOK_URL = webhook;
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length > 0) {
  console.error(`Missing: ${missing.join(', ')}. Set them as repository variables or secrets.`);
  process.exit(1);
}

const changes = releaseFor(version)?.changes ?? [];
const test = Boolean(process.env.DISCORD_TEST);

// Each change reads "Title: text" in the app; here the title gets bold and an emoji, and the text
// after the dash starts with a capital letter.
const EMOJIS = { categorías: '🗂️', calendario: '📅', pdf: '📄', actualizaciones: '🔄', guía: '🧭', novedades: '🔔', 'primera versión': '🎉' };
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const line = (change) => {
  const [head, ...rest] = change.split(': ');
  const title = rest.length > 0 ? head : '';
  const emoji = EMOJIS[title.toLowerCase()] ?? '✨';
  return title ? `${emoji} **${title}** — ${capitalize(rest.join(': '))}` : `${emoji} ${change}`;
};

// The channel where members pick up the role that is mentioned above the embed.
const ROLE_CHANNEL_ID = '1567328874281574451';
// Support tickets are opened here, and they also need the role.
const TICKETS_CHANNEL_ID = '1567345394482941952';

const description = [
  `## 🚀 ¡Ya está aquí la V${version}!`,
  changes.length > 0 ? changes.map(line).join('\n\n') : '✨ Ya hay una versión nueva de ShiftLog.',
  '━━━━━━━━━━━━━━━━━━',
  '📲 **Cómo actualizar:** desde la propia app en **Ajustes → Actualizaciones**, o con el botón de abajo. Tus datos se conservan.',
  `🔔 **Recibe los avisos:** para enterarte de cada versión, consigue el rol <@&${role}> en <#${ROLE_CHANNEL_ID}>.`,
  '💙 **Apoya el proyecto:** ShiftLog es gratis y sin anuncios. Si te gusta, puedes apoyarlo con una donación única del importe que quieras, sin suscripciones, con los botones de abajo.',
  `💬 **¿Dudas o algún fallo?** Estamos dando soporte en este Discord: abre un ticket en <#${TICKETS_CHANNEL_ID}>. También necesitas el rol <@&${role}>.`,
].join('\n\n');

const payload = {
  content: `[<@&${role}>]`,
  // Only the role given above can be mentioned, whatever the text says.
  // In a test the mention is shown but nobody is notified.
  allowed_mentions: test ? { parse: [] } : { roles: [role] },
  embeds: [
    {
      title: `ShiftLog V${version}${test ? ' (prueba)' : ''}`,
      description,
      color: 0x2f6bff,
      footer: { text: 'ShiftLog · Gratis, sin anuncios y de código abierto', icon_url: `${rawRepo}/assets/icon.png` },
      timestamp: new Date().toISOString(),
      image: { url: image },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        // Link buttons; the icons are custom emojis of the server.
        { label: 'Release', emoji: { name: 'GitHub', id: DISCORD_EMOJI_GITHUB }, url: test ? `${repo}/releases/latest` : `${repo}/releases/tag/v${version}` },
        { label: 'GitHub Sponsors', emoji: { name: 'GitHubSponsors', id: DISCORD_EMOJI_SPONSORS }, url: SPONSORS_URL },
        { label: 'PayPal', emoji: { name: 'Paypal', id: DISCORD_EMOJI_PAYPAL }, url: PAYPAL_URL },
        {
          label: `Descargar V${version}`,
          emoji: { name: 'Shiftlog', id: DISCORD_EMOJI_SHIFTLOG },
          url: test ? `${repo}/releases/latest/download/ShiftLog.apk` : `${repo}/releases/download/v${version}/ShiftLog.apk`,
        },
      ].map((button) => ({ type: 2, style: 5, ...button })),
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

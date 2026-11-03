#!/usr/bin/env bash
# Creates the Android signing key once and stores it as GitHub Actions secrets.
#
# Needs: openssl and the GitHub CLI (`gh`) logged in with access to this repository.
# The key and its random password are also saved in ~/ShiftLog-signing so you keep a
# backup (move it to a password manager). Nothing is printed and nothing is committed.
#
# Keep that backup: every update must be signed with the same key, or it will not
# install over the previous version.
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
DIR="$HOME/ShiftLog-signing"
ALIAS="shiftlog"

if [ -e "$DIR/shiftlog.p12" ]; then
  echo "Ya existe una clave en $DIR. No la sobrescribo." >&2
  exit 1
fi

mkdir -p "$DIR"
chmod 700 "$DIR"
cd "$DIR"

PASSWORD="$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | cut -c1-24)"

openssl req -x509 -newkey rsa:2048 -nodes -days 10000 \
  -keyout key.pem -out cert.pem -subj "/CN=ShiftLog/O=ShiftLog" 2>/dev/null
openssl pkcs12 -export -inkey key.pem -in cert.pem -name "$ALIAS" \
  -out shiftlog.p12 -passout "pass:$PASSWORD"
rm -f key.pem cert.pem

printf '%s' "$PASSWORD" > password.txt
printf '%s' "$ALIAS" > alias.txt
chmod 600 shiftlog.p12 password.txt alias.txt

base64 < shiftlog.p12 | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$PASSWORD" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO"
printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS --repo "$REPO"

echo "Listo. Secretos creados en $REPO y copia de seguridad en $DIR"

#!/usr/bin/env bash
# Installs the APK on the running emulator and walks through the app with Maestro.
# Usage: scripts/emulator-test.sh <phone|tablet> <apk>
# Screenshots and the device log end up in test-output/<phone|tablet>.
set -uo pipefail

NAME="$1"
APK="$(realpath "$2")"
ROOT="$(pwd)"
OUT="$ROOT/test-output/$NAME"
mkdir -p "$OUT/shots"

adb install -r "$APK" || exit 1
adb logcat -c
adb logcat -v time > "$OUT/logcat.txt" &
LOGCAT=$!

if [ "$NAME" = tablet ]; then
  adb shell settings put system accelerometer_rotation 0
  adb shell settings put system user_rotation 1
fi

status=0
cd "$OUT/shots"
maestro test "$ROOT/.maestro/light.yaml" || status=$?
adb shell cmd uimode night yes
maestro test "$ROOT/.maestro/dark.yaml" || status=$?

kill "$LOGCAT" 2>/dev/null
if grep -q "FATAL EXCEPTION" "$OUT/logcat.txt"; then
  echo "::error::The app crashed (see logcat.txt)"
  status=1
fi
exit "$status"

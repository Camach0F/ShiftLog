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

# What the app has written to the phone's calendar, one line per event.
calendar_events() {
  adb shell "content query --uri content://com.android.calendar/events --projection title:allDay:dtstart:dtend:description:eventTimezone --where 'deleted=0'" > "$1"
  cat "$1"
}

status=0
cd "$OUT/shots"
if [ "${SCREENSHOTS:-}" = 1 ]; then FLOW=screenshots; else FLOW=light; fi
maestro test --test-output-dir "$OUT/maestro-light" "$ROOT/.maestro/$FLOW.yaml" || status=$?

# Categories and calendar sync. The emulator has no calendar, so make a local one for the app to write to,
# then read back what the app put there.
if [ "${SCREENSHOTS:-}" != 1 ]; then
  adb shell "content insert --uri 'content://com.android.calendar/calendars?caller_is_syncadapter=true&account_name=ShiftLogTest&account_type=LOCAL' --bind account_name:s:ShiftLogTest --bind account_type:s:LOCAL --bind name:s:Prueba --bind calendar_displayName:s:Prueba --bind ownerAccount:s:ShiftLogTest --bind calendar_color:i:-16776961 --bind calendar_access_level:i:700 --bind visible:i:1 --bind sync_events:i:1" || status=1
  maestro test --test-output-dir "$OUT/maestro-sync-a" "$ROOT/.maestro/sync-a.yaml" || status=$?
  sleep 5
  calendar_events "$OUT/calendar-1.txt"
  python3 "$ROOT/scripts/check-calendar.py" 1 "$OUT/calendar-1.txt" || status=1
  maestro test --test-output-dir "$OUT/maestro-sync-b" "$ROOT/.maestro/sync-b.yaml" || status=$?
  sleep 8
  calendar_events "$OUT/calendar-2.txt"
  python3 "$ROOT/scripts/check-calendar.py" 2 "$OUT/calendar-2.txt" || status=1
fi
adb shell cmd uimode night yes
maestro test --test-output-dir "$OUT/maestro-dark" "$ROOT/.maestro/dark.yaml" || status=$?

kill "$LOGCAT" 2>/dev/null
if grep -q "FATAL EXCEPTION" "$OUT/logcat.txt"; then
  echo "::error::The app crashed (see logcat.txt)"
  status=1
fi
exit "$status"

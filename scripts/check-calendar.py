"""Checks the agenda events found in the phone's calendar (output of `content query` on the events table).

Usage: check-calendar.py <1|2> <file>
  1: after connecting the calendar: Cumpleaños (all day), Reunión 09:00-10:00 and Médico 10:00-11:00.
  2: after editing Cumpleaños and deleting Médico.
"""
import re
import sys

DAY = 86400000
HOUR = 3600000


def events(path):
    found = {}
    for line in open(path, encoding="utf-8"):
        if not line.startswith("Row:"):
            continue
        fields = dict(re.findall(r"(\w+)=(.*?)(?:, (?=\w+=)|$)", line.split(" ", 2)[2].strip()))
        found[fields["title"]] = fields
    return found


def check(ok, message):
    print(("ok   " if ok else "FAIL ") + message)
    return ok


phase, path = sys.argv[1], sys.argv[2]
ev = events(path)
results = []
birthday, meeting = ev.get("Cumpleaños"), ev.get("Reunión")
results.append(check(birthday is not None, "Cumpleaños is in the calendar"))
results.append(check(meeting is not None, "Reunión is in the calendar"))
if birthday and meeting:
    start, end = int(birthday["dtstart"]), int(birthday["dtend"])
    results.append(check(birthday["allDay"] == "1", "Cumpleaños is all day"))
    results.append(check(start % DAY == 0 and end - start == DAY, "Cumpleaños spans one UTC day"))
    results.append(check(meeting["allDay"] == "0", "Reunión is timed"))
    results.append(check(int(meeting["dtend"]) - int(meeting["dtstart"]) == HOUR, "Reunión lasts one hour"))
if phase == "1":
    results.append(check("Médico" in ev, "Médico is in the calendar"))
else:
    results.append(check("Médico" not in ev, "Médico was removed from the calendar"))
    results.append(check(birthday is not None and "Con tarta" in birthday["description"], "Cumpleaños has its new note"))
    results.append(check(len(ev) == 2, "two events are left"))
sys.exit(0 if all(results) else 1)

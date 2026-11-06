import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { useSyncExternalStore } from 'react';

import { fromKey } from './dates';
import type { AgendaEvent } from './types';

/**
 * Agenda events (never shifts) are copied into a calendar of the phone, one way: ShiftLog writes,
 * nothing is read back. If that calendar belongs to a Google account, Android syncs it to
 * Google Calendar by itself, so ShiftLog never talks to Google for this.
 *
 * The link between ShiftLog events and calendar events lives only on this device (it is not part
 * of the data or of the Drive backup): the ids that identify an event in the calendar mean
 * nothing on another phone.
 */
const META_KEY = 'shiftlog:calendar-sync';

/** What was written to the calendar for one ShiftLog event. `sig` changes whenever the event does. */
type Linked = { id: string; sig: string };

type Meta = {
  enabled: boolean;
  calendarId: string | null;
  /** Shown in Settings so the user sees where events go */
  calendarName: string | null;
  lastSyncedAt: string | null;
  linked: Record<string, Linked>;
};

export type CalendarOption = { id: string; title: string; account: string; google: boolean };

export type CalendarSyncState = {
  loaded: boolean;
  enabled: boolean;
  calendarName: string | null;
  lastSyncedAt: string | null;
  /** Events currently in the calendar */
  count: number;
  busy: boolean;
  error: string | null;
};

const emptyMeta: Meta = { enabled: false, calendarId: null, calendarName: null, lastSyncedAt: null, linked: {} };

let meta: Meta = emptyMeta;
let state: CalendarSyncState = { loaded: false, enabled: false, calendarName: null, lastSyncedAt: null, count: 0, busy: false, error: null };
const listeners = new Set<() => void>();

function publish(next: Partial<CalendarSyncState> = {}) {
  state = {
    ...state,
    enabled: meta.enabled,
    calendarName: meta.calendarName,
    lastSyncedAt: meta.lastSyncedAt,
    count: Object.keys(meta.linked).length,
    ...next,
  };
  listeners.forEach((l) => l());
}

export const useCalendarSyncState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const getCalendarSyncState = () => state;

async function saveMeta() {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(() => {});
}

export async function initCalendarSync(): Promise<void> {
  if (state.loaded) return;
  try {
    meta = { ...emptyMeta, ...JSON.parse((await AsyncStorage.getItem(META_KEY)) ?? '{}') };
  } catch {
    // Unreadable choices: start with sync off.
  }
  publish({ loaded: true });
}

/** Fields of the calendar event for an agenda event. All-day events use UTC midnights, as Android requires. */
function details(event: AgendaEvent) {
  const day = fromKey(event.date);
  if (event.allDay) {
    const start = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
    return {
      title: event.title,
      notes: event.note,
      location: '',
      allDay: true,
      startDate: new Date(start),
      endDate: new Date(start + 86400000),
      timeZone: 'UTC',
      endTimeZone: 'UTC',
    };
  }
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
  };
  return { title: event.title, notes: event.note, location: '', allDay: false, startDate: at(event.start), endDate: at(event.end) };
}

const signature = (event: AgendaEvent) =>
  [event.title, event.date, event.allDay ? 'all' : `${event.start}-${event.end}`, event.note].join('|');

/** Explains a failure in words the user can act on. */
function describe(error: unknown): string {
  if (error instanceof Error && error.message === 'permission') {
    return 'ShiftLog no tiene permiso para usar el calendario. Actívalo en los ajustes de Android de la app.';
  }
  if (error instanceof Error && error.message === 'missing') {
    return 'El calendario elegido ya no existe. Elige otro.';
  }
  return 'No se pudo sincronizar con el calendario. Inténtalo de nuevo.';
}

async function ensurePermission(): Promise<void> {
  const current = await Calendar.getCalendarPermissions();
  if (current.granted) return;
  const asked = await Calendar.requestCalendarPermissions();
  if (!asked.granted) throw new Error('permission');
}

/** Calendars of the phone that accept new events, those of a Google account first. */
export async function listCalendars(): Promise<CalendarOption[]> {
  await ensurePermission();
  const all = await Calendar.getCalendars();
  return all
    .filter((c) => c.allowsModifications && c.isVisible !== false)
    .map((c) => ({
      id: c.id,
      title: c.title,
      account: c.ownerAccount ?? c.source?.name ?? '',
      google: String(c.source?.type ?? '') === 'com.google',
    }))
    .sort((a, b) => Number(b.google) - Number(a.google) || a.title.localeCompare(b.title));
}

let running = false;
let queued: AgendaEvent[] | null = null;
// After a failure (the calendar app restarting, for example) the sync is tried again a little later.
const RETRY_DELAYS_MS = [5000, 30000, 120000];
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const isMissing = (e: unknown) =>
  /NOT_FOUND/i.test(String((e as { code?: string })?.code ?? '')) || /not found|could not be found/i.test(String((e as Error)?.message ?? ''));

/** The calendar event of a link, or null if it is gone; any other failure (the provider restarting...) is thrown. */
async function find(id: string): Promise<Calendar.ExpoCalendarEvent | null> {
  try {
    return await Calendar.ExpoCalendarEvent.get(id);
  } catch (e) {
    if (isMissing(e)) return null;
    throw e;
  }
}

/**
 * Deletes one event this app wrote to the calendar and forgets the link. If the delete fails the
 * link stays, so the event is not left behind forever: the next sync tries again.
 */
async function drop(key: string): Promise<void> {
  const event = await find(meta.linked[key].id);
  if (event) await event.delete();
  delete meta.linked[key];
}

/** Removes from the calendar every event this app wrote there. */
async function removeLinked(): Promise<void> {
  for (const key of Object.keys(meta.linked)) await drop(key);
}

/** Brings the calendar in line with the agenda: creates, updates and removes only what changed. */
async function reconcile(events: AgendaEvent[]): Promise<void> {
  if (!meta.enabled || !meta.calendarId) return;
  await ensurePermission();
  let calendar: Calendar.ExpoCalendar;
  try {
    calendar = await Calendar.ExpoCalendar.get(meta.calendarId);
  } catch {
    throw new Error('missing');
  }

  const ids = new Set(events.map((e) => e.id));
  for (const key of Object.keys(meta.linked)) {
    if (!ids.has(key)) await drop(key);
  }

  for (const event of events) {
    const sig = signature(event);
    const link = meta.linked[event.id];
    if (link?.sig === sig) continue;
    if (link) {
      const existing = await find(link.id);
      if (existing) {
        await existing.update(details(event));
        meta.linked[event.id] = { id: link.id, sig };
        continue;
      }
      // The event was deleted from the calendar by hand: write it again.
    }
    const created = await calendar.createEvent(details(event));
    meta.linked[event.id] = { id: created.id, sig };
  }
}

/** Runs a sync, one at a time; changes made meanwhile are picked up by one more run. */
export async function syncEvents(events: AgendaEvent[]): Promise<void> {
  if (!meta.enabled) return;
  if (running) {
    queued = events;
    return;
  }
  running = true;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  publish({ busy: true, error: null });
  let error: string | null = null;
  try {
    await reconcile(events);
    meta.lastSyncedAt = new Date().toISOString();
    attempt = 0;
  } catch (e) {
    error = describe(e);
    if (attempt < RETRY_DELAYS_MS.length && !(e instanceof Error && ['permission', 'missing'].includes(e.message))) {
      retryTimer = setTimeout(() => syncEvents(events), RETRY_DELAYS_MS[attempt++]);
    }
  } finally {
    await saveMeta();
    running = false;
    publish({ busy: false, error });
  }
  if (queued) {
    const next = queued;
    queued = null;
    await syncEvents(next);
  }
}

/** Starts writing to the chosen calendar. Events already written to another one are moved. */
export async function enableSync(calendar: CalendarOption, events: AgendaEvent[]): Promise<void> {
  if (running) return;
  running = true;
  publish({ busy: true, error: null });
  try {
    await ensurePermission();
    if (meta.calendarId !== calendar.id) await removeLinked();
    meta = { ...meta, enabled: true, calendarId: calendar.id, calendarName: calendar.account ? `${calendar.title} (${calendar.account})` : calendar.title };
    await saveMeta();
  } catch (e) {
    publish({ busy: false, error: describe(e) });
    running = false;
    return;
  }
  running = false;
  publish({ busy: false });
  await syncEvents(events);
}

/** Stops syncing. With `removeEvents`, the events ShiftLog wrote are also deleted from the calendar. */
export async function disableSync(removeEvents: boolean): Promise<void> {
  if (running) return;
  running = true;
  publish({ busy: true, error: null });
  let error: string | null = null;
  try {
    if (removeEvents) {
      await ensurePermission();
      await removeLinked();
    }
  } catch (e) {
    error = describe(e);
  }
  meta = removeEvents && error === null ? emptyMeta : { ...meta, enabled: false };
  await saveMeta();
  running = false;
  publish({ busy: false, error });
}

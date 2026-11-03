import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import type { AgendaEvent, AppState, EventTemplate, Job, JobTemplate, Overtime, Rotation, Settings, ShiftEntry, ShiftType } from './types';

const STORAGE_KEY = 'shiftlog:v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** A calendar entry that starts from a shift type; its hours can still be edited afterwards. */
export const entryFromType = (type: ShiftType, date: string): ShiftEntry => ({
  id: newId(),
  date,
  jobId: type.jobId,
  typeId: type.id,
  note: '',
});

export const defaultOvertime: Overtime = { enabled: false, dailyHours: null, weeklyHours: 40, multiplier: 1.5 };

const initialState: AppState = {
  jobs: [],
  types: [],
  entries: [],
  rotations: [],
  templates: [],
  eventTemplates: [],
  events: [],
  settings: { currency: '€', weekStartsOn: 1, quickAdd: false, checkUpdates: true },
};

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'saveEntry'; entry: ShiftEntry }
  | { type: 'deleteEntry'; id: string }
  | { type: 'applyEntries'; add: ShiftEntry[]; removeIds: string[] }
  | { type: 'saveJob'; job: Job }
  | { type: 'deleteJob'; id: string }
  | { type: 'saveType'; shiftType: ShiftType }
  | { type: 'deleteType'; id: string }
  | { type: 'saveRotation'; rotation: Rotation }
  | { type: 'deleteRotation'; id: string }
  | { type: 'saveTemplate'; template: JobTemplate }
  | { type: 'deleteTemplate'; id: string }
  | { type: 'saveEventTemplate'; template: EventTemplate }
  | { type: 'deleteEventTemplate'; id: string }
  | { type: 'saveEvent'; event: AgendaEvent }
  | { type: 'deleteEvent'; id: string }
  | { type: 'setSettings'; settings: Partial<Settings> };

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

/** Removes shift types together with their calendar entries and rotation days. */
function removeTypes(state: AppState, ids: Set<string>): Pick<AppState, 'types' | 'entries' | 'rotations'> {
  return {
    types: state.types.filter((t) => !ids.has(t.id)),
    entries: state.entries.filter((e) => e.typeId === null || !ids.has(e.typeId)),
    rotations: state.rotations.map((r) => ({ ...r, cycle: r.cycle.map((c) => (c !== null && ids.has(c) ? null : c)) })),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return action.state;
    case 'saveEntry':
      return { ...state, entries: upsert(state.entries, action.entry) };
    case 'deleteEntry':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case 'applyEntries': {
      const remove = new Set(action.removeIds);
      return { ...state, entries: [...state.entries.filter((e) => !remove.has(e.id)), ...action.add] };
    }
    case 'saveJob':
      return { ...state, jobs: upsert(state.jobs, action.job) };
    case 'deleteJob': {
      const typeIds = new Set(state.types.filter((t) => t.jobId === action.id).map((t) => t.id));
      const removed = removeTypes(state, typeIds);
      return {
        ...state,
        ...removed,
        entries: removed.entries.filter((e) => e.jobId !== action.id),
        jobs: state.jobs.filter((j) => j.id !== action.id),
      };
    }
    case 'saveType':
      return { ...state, types: upsert(state.types, action.shiftType) };
    case 'deleteType':
      return { ...state, ...removeTypes(state, new Set([action.id])) };
    case 'saveRotation':
      return { ...state, rotations: upsert(state.rotations, action.rotation) };
    case 'deleteRotation':
      return { ...state, rotations: state.rotations.filter((r) => r.id !== action.id) };
    case 'saveTemplate':
      return { ...state, templates: upsert(state.templates, action.template) };
    case 'deleteTemplate':
      return { ...state, templates: state.templates.filter((t) => t.id !== action.id) };
    case 'saveEventTemplate':
      return { ...state, eventTemplates: upsert(state.eventTemplates, action.template) };
    case 'deleteEventTemplate':
      return { ...state, eventTemplates: state.eventTemplates.filter((t) => t.id !== action.id) };
    case 'saveEvent':
      return { ...state, events: upsert(state.events, action.event) };
    case 'deleteEvent':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
  }
}

type Store = {
  state: AppState;
  ready: boolean;
  saveEntry: (entry: ShiftEntry) => void;
  deleteEntry: (id: string) => void;
  applyEntries: (add: ShiftEntry[], removeIds: string[]) => void;
  saveJob: (job: Job) => void;
  deleteJob: (id: string) => void;
  saveType: (shiftType: ShiftType) => void;
  deleteType: (id: string) => void;
  saveRotation: (rotation: Rotation) => void;
  deleteRotation: (id: string) => void;
  saveTemplate: (template: JobTemplate) => void;
  deleteTemplate: (id: string) => void;
  saveEventTemplate: (template: EventTemplate) => void;
  deleteEventTemplate: (id: string) => void;
  saveEvent: (event: AgendaEvent) => void;
  deleteEvent: (id: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
};

const StoreContext = createContext<Store | null>(null);

/**
 * Reads what an earlier version saved. Before jobs existed there was a single implicit job:
 * its shift types and the global overtime settings move into a job called "Mi trabajo".
 */
function migrate(saved: Record<string, any>): AppState {
  const state: AppState = {
    ...initialState,
    ...saved,
    settings: {
      ...initialState.settings,
      currency: saved.settings?.currency ?? '€',
      weekStartsOn: saved.settings?.weekStartsOn ?? 1,
      quickAdd: saved.settings?.quickAdd ?? false,
      checkUpdates: saved.settings?.checkUpdates ?? true,
    },
  };
  if (!saved.jobs && state.types.length > 0) {
    state.jobs = [
      {
        id: 'default',
        name: 'Mi trabajo',
        color: '#3B82F6',
        payType: 'hourly',
        hourlyRate: null,
        fixedRate: null,
        overtime: { ...defaultOvertime, ...saved.settings?.overtime },
      },
    ];
    state.types = state.types.map((t) => ({ ...t, jobId: 'default' }));
  }
  // Shift types used to carry a color and an hourly rate of their own; now both belong to the job.
  // A job without a rate takes the first one set on its shift types, so existing pay is not lost.
  type OldType = ShiftType & { color?: string; hourlyRate?: number | null };
  const oldTypes = state.types as OldType[];
  state.jobs = state.jobs.map((job) => ({
    ...job,
    payType: job.payType ?? 'hourly',
    fixedRate: job.fixedRate ?? null,
    hourlyRate: job.hourlyRate ?? oldTypes.find((x) => x.jobId === job.id && x.hourlyRate != null)?.hourlyRate ?? null,
  }));
  state.types = oldTypes.map(({ color: _color, hourlyRate: _rate, ...type }) => type);
  // Entries used to belong to a job only through their shift type.
  const jobOfType = new Map(state.types.map((t) => [t.id, t.jobId]));
  state.entries = state.entries
    .map((e) => ({ ...e, jobId: e.jobId ?? (e.typeId ? jobOfType.get(e.typeId) : undefined) }))
    .filter((e): e is ShiftEntry => e.jobId !== undefined);
  return state;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) dispatch({ type: 'load', state: migrate(JSON.parse(raw)) });
      } catch {
        // Unreadable data: start from the defaults.
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const store = useMemo<Store>(
    () => ({
      state,
      ready,
      saveEntry: (entry) => dispatch({ type: 'saveEntry', entry }),
      deleteEntry: (id) => dispatch({ type: 'deleteEntry', id }),
      applyEntries: (add, removeIds) => dispatch({ type: 'applyEntries', add, removeIds }),
      saveJob: (job) => dispatch({ type: 'saveJob', job }),
      deleteJob: (id) => dispatch({ type: 'deleteJob', id }),
      saveType: (shiftType) => dispatch({ type: 'saveType', shiftType }),
      deleteType: (id) => dispatch({ type: 'deleteType', id }),
      saveRotation: (rotation) => dispatch({ type: 'saveRotation', rotation }),
      deleteRotation: (id) => dispatch({ type: 'deleteRotation', id }),
      saveTemplate: (template) => dispatch({ type: 'saveTemplate', template }),
      deleteTemplate: (id) => dispatch({ type: 'deleteTemplate', id }),
      saveEventTemplate: (template) => dispatch({ type: 'saveEventTemplate', template }),
      deleteEventTemplate: (id) => dispatch({ type: 'deleteEventTemplate', id }),
      saveEvent: (event) => dispatch({ type: 'saveEvent', event }),
      deleteEvent: (id) => dispatch({ type: 'deleteEvent', id }),
      setSettings: (settings) => dispatch({ type: 'setSettings', settings }),
    }),
    [state, ready],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

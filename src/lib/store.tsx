import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import type { AgendaEvent, AppState, Job, Overtime, Rotation, Settings, ShiftEntry, ShiftType } from './types';

const STORAGE_KEY = 'shiftlog:v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const defaultOvertime: Overtime = { enabled: false, dailyHours: null, weeklyHours: 40, multiplier: 1.5 };

const initialState: AppState = {
  jobs: [],
  types: [],
  entries: [],
  rotations: [],
  events: [],
  settings: { currency: '€', weekStartsOn: 1 },
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
  | { type: 'saveEvent'; event: AgendaEvent }
  | { type: 'deleteEvent'; id: string }
  | { type: 'setSettings'; settings: Partial<Settings> };

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

/** Removes shift types together with their calendar entries and rotation days. */
function removeTypes(state: AppState, ids: Set<string>): Pick<AppState, 'types' | 'entries' | 'rotations'> {
  return {
    types: state.types.filter((t) => !ids.has(t.id)),
    entries: state.entries.filter((e) => !ids.has(e.typeId)),
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
      return { ...state, ...removeTypes(state, typeIds), jobs: state.jobs.filter((j) => j.id !== action.id) };
    }
    case 'saveType':
      return { ...state, types: upsert(state.types, action.shiftType) };
    case 'deleteType':
      return { ...state, ...removeTypes(state, new Set([action.id])) };
    case 'saveRotation':
      return { ...state, rotations: upsert(state.rotations, action.rotation) };
    case 'deleteRotation':
      return { ...state, rotations: state.rotations.filter((r) => r.id !== action.id) };
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
    settings: { ...initialState.settings, currency: saved.settings?.currency ?? '€', weekStartsOn: saved.settings?.weekStartsOn ?? 1 },
  };
  if (!saved.jobs && state.types.length > 0) {
    state.jobs = [
      {
        id: 'default',
        name: 'Mi trabajo',
        color: '#3B82F6',
        hourlyRate: null,
        overtime: { ...defaultOvertime, ...saved.settings?.overtime },
      },
    ];
    state.types = state.types.map((t) => ({ ...t, jobId: 'default' }));
  }
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

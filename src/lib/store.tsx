import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';

import type { AppState, Rotation, Settings, ShiftEntry, ShiftType } from './types';

const STORAGE_KEY = 'shiftlog:v1';

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const initialState: AppState = {
  types: [
    { id: 'morning', name: 'Mañana', color: '#F59E0B', start: '07:00', end: '15:00', breakMin: 30, hourlyRate: null },
    { id: 'afternoon', name: 'Tarde', color: '#3B82F6', start: '15:00', end: '23:00', breakMin: 30, hourlyRate: null },
    { id: 'night', name: 'Noche', color: '#8B5CF6', start: '23:00', end: '07:00', breakMin: 30, hourlyRate: null },
    { id: 'off', name: 'Libre', color: '#10B981', start: '00:00', end: '00:00', breakMin: 0, hourlyRate: null },
  ],
  entries: [],
  rotations: [],
  settings: {
    currency: '€',
    weekStartsOn: 1,
    overtime: { enabled: false, dailyHours: null, weeklyHours: 40, multiplier: 1.5 },
  },
};

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'saveEntry'; entry: ShiftEntry }
  | { type: 'deleteEntry'; id: string }
  | { type: 'applyEntries'; add: ShiftEntry[]; removeIds: string[] }
  | { type: 'saveType'; shiftType: ShiftType }
  | { type: 'deleteType'; id: string }
  | { type: 'saveRotation'; rotation: Rotation }
  | { type: 'deleteRotation'; id: string }
  | { type: 'setSettings'; settings: Partial<Settings> };

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

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
    case 'saveType':
      return { ...state, types: upsert(state.types, action.shiftType) };
    case 'deleteType':
      return {
        ...state,
        types: state.types.filter((t) => t.id !== action.id),
        entries: state.entries.filter((e) => e.typeId !== action.id),
        // A removed type becomes an empty day in every rotation using it.
        rotations: state.rotations.map((r) => ({ ...r, cycle: r.cycle.map((c) => (c === action.id ? null : c)) })),
      };
    case 'saveRotation':
      return { ...state, rotations: upsert(state.rotations, action.rotation) };
    case 'deleteRotation':
      return { ...state, rotations: state.rotations.filter((r) => r.id !== action.id) };
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
  saveType: (shiftType: ShiftType) => void;
  deleteType: (id: string) => void;
  saveRotation: (rotation: Rotation) => void;
  deleteRotation: (id: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
};

const StoreContext = createContext<Store | null>(null);

function mergeSaved(saved: Partial<AppState>): AppState {
  return {
    ...initialState,
    ...saved,
    settings: {
      ...initialState.settings,
      ...saved.settings,
      overtime: { ...initialState.settings.overtime, ...saved.settings?.overtime },
    },
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) dispatch({ type: 'load', state: mergeSaved(JSON.parse(raw) as Partial<AppState>) });
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
      saveType: (shiftType) => dispatch({ type: 'saveType', shiftType }),
      deleteType: (id) => dispatch({ type: 'deleteType', id }),
      saveRotation: (rotation) => dispatch({ type: 'saveRotation', rotation }),
      deleteRotation: (id) => dispatch({ type: 'deleteRotation', id }),
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

const SEEN_KEY = 'shiftlog:tour-seen';

export type TourStep = {
  /** Screen to show behind the card; null = stay where the user is */
  route: '/' | '/shifts' | '/summary' | '/jobs' | null;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  text: string;
};

/** The guided tour: one card per step, over the real screen it talks about. */
export const TOUR_STEPS: TourStep[] = [
  {
    route: null,
    icon: 'sparkles',
    title: 'Te damos la bienvenida a ShiftLog',
    text: 'Una guía rápida para que sepas dónde está cada cosa. Puedes saltarla y volver a verla cuando quieras desde Ajustes.',
  },
  {
    route: '/jobs',
    icon: 'briefcase',
    title: '1. Crea tu trabajo',
    text: 'Empieza aquí. Pulsa «Nuevo trabajo», ponle nombre y color, elige cómo se cobra (por horas o por trabajo) y añade sus turnos: Mañana, Tarde, Noche… Las plantillas te lo ponen más fácil.',
  },
  {
    route: '/jobs',
    icon: 'folder-open',
    title: 'Categorías',
    text: 'Con «Nueva categoría» agrupas tus trabajos, por ejemplo por sector o por cliente. Abre una categoría para añadirle trabajos o crear uno dentro.',
  },
  {
    route: '/shifts',
    icon: 'time',
    title: '2. Apunta tus turnos',
    text: 'Toca un día del calendario y elige el turno que has hecho. Puedes ajustar sus horas solo para ese día, poner varios turnos el mismo día o repetir un patrón con una rotación.',
  },
  {
    route: '/summary',
    icon: 'stats-chart',
    title: '3. Mira tu resumen',
    text: 'Horas, horas extra e ingresos por semana, mes o año, con el desglose por trabajo y por categoría. Desde aquí generas el PDF, eligiendo mes y categoría, o el CSV.',
  },
  {
    route: '/',
    icon: 'calendar',
    title: 'Agenda',
    text: 'Para tus citas, recordatorios y cumpleaños. Toca un día y pulsa «Nuevo evento». Los eventos nunca cuentan como horas trabajadas.',
  },
  {
    route: '/jobs',
    icon: 'settings',
    title: 'Ajustes',
    text: 'En la pestaña Trabajos, más abajo: sincroniza tu agenda con el calendario del móvil, guarda una copia en Google Drive, busca actualizaciones y vuelve a abrir esta guía.',
  },
  {
    route: null,
    icon: 'checkmark-circle',
    title: '¡Todo listo!',
    text: 'Si te pierdes o tienes dudas, estamos dando soporte en Discord.',
  },
];

type TourState = { open: boolean };
let state: TourState = { open: false };
const listeners = new Set<() => void>();

export const useTourState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

function set(open: boolean) {
  state = { open };
  listeners.forEach((l) => l());
}

export const openTour = () => set(true);
export const closeTour = () => set(false);

export async function readTourSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) !== null;
  } catch {
    return true;
  }
}

export async function writeTourSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
}

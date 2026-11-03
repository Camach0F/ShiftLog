import { defaultOvertime, newId } from './store';
import type { EventTemplate, Job, JobTemplate, ShiftType } from './types';

const shift = (name: string, start: string, end: string, breakMin: number) => ({
  name,
  start,
  end,
  breakMin,
  hourlyRate: null,
});

const base = { hourlyRate: null, overtime: defaultOvertime };

/** Starting points shipped with the app; the user's own templates are stored with their data. */
export const BUILT_IN_TEMPLATES: JobTemplate[] = [
  {
    id: 'builtin:office',
    name: 'Oficina',
    color: '#3B82F6',
    ...base,
    shifts: [shift('Jornada', '09:00', '17:00', 60), shift('Media jornada', '09:00', '13:00', 0)],
  },
  {
    id: 'builtin:rotating',
    name: 'Turnos rotativos',
    color: '#8B5CF6',
    ...base,
    shifts: [
      shift('Mañana', '07:00', '15:00', 30),
      shift('Tarde', '15:00', '23:00', 30),
      shift('Noche', '23:00', '07:00', 30),
      shift('Libre', '00:00', '00:00', 0),
    ],
  },
  {
    id: 'builtin:hospitality',
    name: 'Hostelería',
    color: '#F59E0B',
    ...base,
    shifts: [shift('Comida', '11:00', '17:00', 30), shift('Cena', '17:00', '00:00', 30), shift('Partido', '12:00', '23:00', 180)],
  },
];

export const isBuiltIn = (template: { id: string }) => template.id.startsWith('builtin:');

/** Snapshot of a job and its shift types, to create similar jobs later. */
export function templateFromJob(job: Job, types: ShiftType[], id: string = newId()): JobTemplate {
  return {
    id,
    name: job.name,
    color: job.color,
    hourlyRate: job.hourlyRate,
    overtime: job.overtime,
    shifts: types.map(({ name, start, end, breakMin, hourlyRate }) => ({ name, start, end, breakMin, hourlyRate })),
  };
}

const event = (id: string, title: string, color: string, allDay: boolean, start = '09:00', end = '10:00'): EventTemplate => ({
  id: `builtin:${id}`,
  title,
  color,
  allDay,
  start,
  end,
  note: '',
});

/** Starting points for the agenda; the user's own event templates are stored with their data. */
export const BUILT_IN_EVENT_TEMPLATES: EventTemplate[] = [
  event('doctor', 'Médico', '#EF4444', false, '10:00', '11:00'),
  event('meeting', 'Reunión', '#3B82F6', false, '09:00', '10:00'),
  event('birthday', 'Cumpleaños', '#EC4899', true),
];

import { defaultOvertime, newId } from './store';
import type { Job, JobTemplate, ShiftType } from './types';

const shift = (name: string, color: string, start: string, end: string, breakMin: number) => ({
  name,
  color,
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
    shifts: [shift('Jornada', '#3B82F6', '09:00', '17:00', 60), shift('Media jornada', '#14B8A6', '09:00', '13:00', 0)],
  },
  {
    id: 'builtin:rotating',
    name: 'Turnos rotativos',
    color: '#8B5CF6',
    ...base,
    shifts: [
      shift('Mañana', '#F59E0B', '07:00', '15:00', 30),
      shift('Tarde', '#3B82F6', '15:00', '23:00', 30),
      shift('Noche', '#8B5CF6', '23:00', '07:00', 30),
      shift('Libre', '#10B981', '00:00', '00:00', 0),
    ],
  },
  {
    id: 'builtin:hospitality',
    name: 'Hostelería',
    color: '#F59E0B',
    ...base,
    shifts: [shift('Comida', '#F59E0B', '11:00', '17:00', 30), shift('Cena', '#EF4444', '17:00', '00:00', 30), shift('Partido', '#EC4899', '12:00', '23:00', 180)],
  },
];

export const isBuiltIn = (template: JobTemplate) => template.id.startsWith('builtin:');

/** Snapshot of a job and its shift types, to create similar jobs later. */
export function templateFromJob(job: Job, types: ShiftType[], id: string = newId()): JobTemplate {
  return {
    id,
    name: job.name,
    color: job.color,
    hourlyRate: job.hourlyRate,
    overtime: job.overtime,
    shifts: types.map(({ name, color, start, end, breakMin, hourlyRate }) => ({ name, color, start, end, breakMin, hourlyRate })),
  };
}

import { startOfWeek } from './dates';
import type { AppState, Job, ShiftEntry, ShiftType } from './types';

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (t: string) => TIME_RE.test(t.trim());

/** "7:5" is rejected; "7:05" becomes "07:05". */
export function normalizeTime(t: string): string | null {
  const m = TIME_RE.exec(t.trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

function toMinutes(t: string): number {
  const m = TIME_RE.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
}

/** Worked minutes between two times, crossing midnight when end < start. */
export function shiftMinutes(start: string, end: string, breakMin: number): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  const span = e >= s ? e - s : e + 24 * 60 - s;
  return Math.max(0, span - Math.max(0, breakMin));
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

export const formatMoney = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`;

const FALLBACK = { start: '09:00', end: '17:00', breakMin: 0 };

/** A calendar entry with everything it inherits from its job and shift type filled in. */
export type Resolved = {
  entry: ShiftEntry;
  job: Job;
  type: ShiftType | null;
  /** Shift type name, or the job's name for an entry with its own schedule */
  name: string;
  color: string;
  start: string;
  end: string;
  breakMin: number;
  minutes: number;
  rate: number | null;
};

/** Shift types are suggestions: values stored on the entry win over the type's. */
export function resolveEntry(entry: ShiftEntry, types: Map<string, ShiftType>, jobs: Map<string, Job>): Resolved | null {
  const job = jobs.get(entry.jobId);
  const type = entry.typeId ? (types.get(entry.typeId) ?? null) : null;
  if (!job || (entry.typeId && !type)) return null;
  const start = entry.start ?? type?.start ?? FALLBACK.start;
  const end = entry.end ?? type?.end ?? FALLBACK.end;
  const breakMin = entry.breakMin ?? type?.breakMin ?? FALLBACK.breakMin;
  return {
    entry,
    job,
    type,
    name: type?.name ?? job.name,
    color: job.color,
    start,
    end,
    breakMin,
    minutes: shiftMinutes(start, end, breakMin),
    rate: job.hourlyRate,
  };
}

/** Orders a day's entries by the time they start. */
export const byStart = (a: Resolved, b: Resolved) => a.start.localeCompare(b.start);

export type TypeTotals = { key: string; name: string; color: string; job: Job; count: number; minutes: number; pay: number };
export type JobTotals = { job: Job; minutes: number; pay: number; overtimeMinutes: number; worked: number };

type Data = Pick<AppState, 'entries' | 'types' | 'jobs' | 'settings'>;

/**
 * Overtime of one job. Daily overtime counts for the days inside the range. Weekly overtime
 * (what is left above the weekly limit once daily overtime is taken out) counts for the range
 * that contains the first day of that week, so a week split between two months is never
 * counted twice.
 */
function overtimeFor(entries: Resolved[], job: Job, from: string, to: string, weekStartsOn: number) {
  const { overtime } = job;
  const days = new Map<string, { min: number; pay: number }>();
  for (const r of entries) {
    const day = days.get(r.entry.date) ?? { min: 0, pay: 0 };
    day.min += r.minutes;
    day.pay += r.rate ? (r.minutes / 60) * r.rate : 0;
    days.set(r.entry.date, day);
  }

  const weeks = new Map<string, string[]>();
  for (const key of days.keys()) {
    const week = startOfWeek(key, weekStartsOn);
    weeks.set(week, [...(weeks.get(week) ?? []), key]);
  }

  const extra = overtime.multiplier - 1;
  let minutes = 0;
  let pay = 0;
  for (const [weekStart, keys] of weeks) {
    let weekMin = 0;
    let weekPay = 0;
    let dailyOt = 0;
    for (const key of keys) {
      const day = days.get(key)!;
      weekMin += day.min;
      weekPay += day.pay;
      const ot = overtime.dailyHours != null ? Math.max(0, day.min - overtime.dailyHours * 60) : 0;
      dailyOt += ot;
      if (ot > 0 && key >= from && key <= to) {
        minutes += ot;
        pay += (ot / day.min) * day.pay * extra;
      }
    }
    if (overtime.weeklyHours != null && weekStart >= from && weekStart <= to) {
      const ot = Math.max(0, weekMin - dailyOt - overtime.weeklyHours * 60);
      minutes += ot;
      if (ot > 0) pay += (ot / weekMin) * weekPay * extra;
    }
  }
  return { minutes, pay };
}

/** Totals for a date range, optionally restricted to one job. */
export function summarize(data: Data, from: string, to: string, jobId: string | null = null) {
  const types = new Map(data.types.map((t) => [t.id, t]));
  const jobs = new Map(data.jobs.map((j) => [j.id, j]));
  const perType = new Map<string, TypeTotals>();
  const perJob = new Map<string, JobTotals>();
  const inJob = new Map<string, Resolved[]>();

  for (const e of data.entries) {
    const r = resolveEntry(e, types, jobs);
    if (!r || (jobId !== null && r.job.id !== jobId)) continue;
    inJob.set(r.job.id, [...(inJob.get(r.job.id) ?? []), r]);
    if (e.date < from || e.date > to) continue;

    const earned = r.rate ? (r.minutes / 60) * r.rate : 0;

    const key = r.type?.id ?? `own:${r.job.id}`;
    const row = perType.get(key) ?? { key, name: r.type?.name ?? 'Horario propio', color: r.color, job: r.job, count: 0, minutes: 0, pay: 0 };
    row.count += 1;
    row.minutes += r.minutes;
    row.pay += earned;
    perType.set(key, row);

    const jobRow = perJob.get(r.job.id) ?? { job: r.job, minutes: 0, pay: 0, overtimeMinutes: 0, worked: 0 };
    jobRow.minutes += r.minutes;
    jobRow.pay += earned;
    if (r.minutes > 0) jobRow.worked += 1;
    perJob.set(r.job.id, jobRow);
  }

  let overtimeMinutes = 0;
  let overtimePay = 0;
  for (const [id, entries] of inJob) {
    const job = jobs.get(id)!;
    if (!job.overtime.enabled) continue;
    const ot = overtimeFor(entries, job, from, to, data.settings.weekStartsOn);
    overtimeMinutes += ot.minutes;
    overtimePay += ot.pay;
    const jobRow = perJob.get(id) ?? { job, minutes: 0, pay: 0, overtimeMinutes: 0, worked: 0 };
    jobRow.overtimeMinutes = ot.minutes;
    jobRow.pay += ot.pay;
    perJob.set(id, jobRow);
  }

  const jobRows = [...perJob.values()].sort((a, b) => b.minutes - a.minutes);
  return {
    minutes: jobRows.reduce((n, r) => n + r.minutes, 0),
    /** Base pay plus the overtime premium */
    pay: jobRows.reduce((n, r) => n + r.pay, 0),
    overtimeMinutes,
    overtimePay,
    worked: jobRows.reduce((n, r) => n + r.worked, 0),
    rows: [...perType.values()].sort((a, b) => b.minutes - a.minutes),
    jobRows,
  };
}

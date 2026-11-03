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

export function effective(entry: ShiftEntry, type: ShiftType) {
  return {
    start: entry.start ?? type.start,
    end: entry.end ?? type.end,
    breakMin: entry.breakMin ?? type.breakMin,
  };
}

export function entryMinutes(entry: ShiftEntry, type: ShiftType): number {
  const { start, end, breakMin } = effective(entry, type);
  return shiftMinutes(start, end, breakMin);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

export const formatMoney = (amount: number, currency: string) => `${amount.toFixed(2)} ${currency}`;

/** Hourly rate of a shift type: its own override, else the job's, else none. */
export const rateFor = (type: ShiftType, job: Job | undefined) => type.hourlyRate ?? job?.hourlyRate ?? null;

export type TypeTotals = { type: ShiftType; job: Job | undefined; count: number; minutes: number; pay: number };
export type JobTotals = { job: Job; minutes: number; pay: number; overtimeMinutes: number; worked: number };

type Data = Pick<AppState, 'entries' | 'types' | 'jobs' | 'settings'>;

/**
 * Overtime of one job. Daily overtime counts for the days inside the range. Weekly overtime
 * (what is left above the weekly limit once daily overtime is taken out) counts for the range
 * that contains the first day of that week, so a week split between two months is never
 * counted twice.
 */
function overtimeFor(entries: ShiftEntry[], types: Map<string, ShiftType>, job: Job, from: string, to: string, weekStartsOn: number) {
  const { overtime } = job;
  const days = new Map<string, { min: number; pay: number }>();
  for (const e of entries) {
    const type = types.get(e.typeId);
    if (!type) continue;
    const min = entryMinutes(e, type);
    const rate = rateFor(type, job);
    const day = days.get(e.date) ?? { min: 0, pay: 0 };
    day.min += min;
    day.pay += rate ? (min / 60) * rate : 0;
    days.set(e.date, day);
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
  const inJob = new Map<string, ShiftEntry[]>();

  for (const e of data.entries) {
    const type = types.get(e.typeId);
    const job = type && jobs.get(type.jobId);
    if (!type || !job || (jobId !== null && job.id !== jobId)) continue;
    inJob.set(job.id, [...(inJob.get(job.id) ?? []), e]);
    if (e.date < from || e.date > to) continue;

    const min = entryMinutes(e, type);
    const rate = rateFor(type, job);
    const earned = rate ? (min / 60) * rate : 0;

    const row = perType.get(type.id) ?? { type, job, count: 0, minutes: 0, pay: 0 };
    row.count += 1;
    row.minutes += min;
    row.pay += earned;
    perType.set(type.id, row);

    const jobRow = perJob.get(job.id) ?? { job, minutes: 0, pay: 0, overtimeMinutes: 0, worked: 0 };
    jobRow.minutes += min;
    jobRow.pay += earned;
    if (min > 0) jobRow.worked += 1;
    perJob.set(job.id, jobRow);
  }

  let overtimeMinutes = 0;
  let overtimePay = 0;
  for (const [id, entries] of inJob) {
    const job = jobs.get(id)!;
    if (!job.overtime.enabled) continue;
    const ot = overtimeFor(entries, types, job, from, to, data.settings.weekStartsOn);
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

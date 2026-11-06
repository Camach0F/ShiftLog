import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatMonth, fromKey } from './dates';
import { resolveEntry, summarize } from './hours';
import { LOGO_DATA_URI } from './logo';
import type { AppState } from './types';

type Data = Pick<AppState, 'entries' | 'types' | 'jobs' | 'settings'>;
type Row = { date: string; job: string; color: string; name: string; start: string; end: string; breakMin: number; minutes: number; pay: number; note: string };

function rowsFor(data: Data, from: string, to: string, jobId: string | null): Row[] {
  const types = new Map(data.types.map((t) => [t.id, t]));
  const jobs = new Map(data.jobs.map((j) => [j.id, j]));
  const rows: Row[] = [];
  for (const e of data.entries) {
    const r = resolveEntry(e, types, jobs);
    if (!r || e.date < from || e.date > to || (jobId !== null && r.job.id !== jobId)) continue;
    rows.push({
      date: e.date,
      job: r.job.name,
      color: r.job.color,
      name: r.type?.name ?? 'Horario propio',
      start: r.start,
      end: r.end,
      breakMin: r.breakMin,
      minutes: r.minutes,
      pay: r.earned,
      note: e.note,
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/** Which jobs a report covers: all of them, or those of one category (null = the uncategorized ones). */
export type CategoryScope = 'all' | { categoryId: string | null };

/** The data restricted to the jobs of a category; shifts of other jobs are left out. */
export function inCategory(data: Data, scope: CategoryScope): Data {
  if (scope === 'all') return data;
  const jobs = data.jobs.filter((j) => (j.categoryId ?? null) === scope.categoryId);
  const ids = new Set(jobs.map((j) => j.id));
  return { ...data, jobs, entries: data.entries.filter((e) => ids.has(e.jobId)) };
}

const csvCell = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
// Spanish spreadsheets read ";" as separator and "," as decimal mark.
const decimal = (n: number) => n.toFixed(2).replace('.', ',');

export function buildCsv(data: Data, from: string, to: string, jobId: string | null): string {
  const lines = [['Fecha', 'Trabajo', 'Turno', 'Entrada', 'Salida', 'Descanso (min)', 'Horas', 'Ingresos', 'Nota'].join(';')];
  for (const r of rowsFor(data, from, to, jobId)) {
    lines.push(
      [r.date, r.job, r.name, r.start, r.end, String(r.breakMin), decimal(r.minutes / 60), decimal(r.pay), r.note].map(csvCell).join(';'),
    );
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** "7 h 30 min" / "8 h", the way the report writes durations. */
const longDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m !== 0 ? `${h} h ${m} min` : `${h} h`;
};

/**
 * A4 report: the app's logo and name, the period, then one row per day with a colored job label,
 * the hours of each shift and how long it lasted, weekends highlighted, and the total at the bottom.
 */
export function buildHtml(data: Data, from: string, to: string, label: string, jobId: string | null): string {
  const rows = rowsFor(data, from, to, jobId);
  const totals = summarize(data, from, to, jobId);

  const byDay = new Map<string, Row[]>();
  for (const r of rows) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);

  const days = [...byDay.entries()]
    .map(([date, list]) => {
      const d = fromKey(date);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const entries = list
        .map((r) => {
          const hours = r.minutes > 0 ? `${r.start} - ${r.end}` : 'Sin horas';
          return `<div class="entry"><span class="badge" style="background:${esc(r.color)}">${esc(r.job.toUpperCase())}</span><span class="time">${hours}</span><span class="dur">${longDuration(r.minutes)}</span></div>`;
        })
        .join('');
      return `<div class="day${weekend ? ' weekend' : ''}"><div class="dn">${d.getDate()}</div><div class="dw">${WEEKDAYS[d.getDay()]}</div><div class="entries">${entries}</div></div>`;
    })
    .join('');

  return `<html><head><meta charset="utf-8" /><style>
    body { font-family: Helvetica, Arial, sans-serif; color: #171717; margin: 0; }
    .brand { display: flex; align-items: center; margin-bottom: 20px; }
    .logo { width: 34px; height: 34px; border-radius: 8px; margin-right: 10px; }
    .app { font-size: 18px; font-weight: bold; color: #2F6BFF; }
    h1 { font-size: 22px; margin: 0 0 10px; }
    .rule { height: 1.7px; background: #2F6BFF; }
    .head { font-size: 8px; font-weight: bold; color: #2F6BFF; margin: 14px 0 8px; display: flex; }
    .head span:first-child { width: 62px; }
    .day { display: flex; align-items: flex-start; padding: 6px 5px; border-bottom: 0.6px solid #E1E1E3; page-break-inside: avoid; }
    .weekend { background: #EEF2FF; }
    .dn { width: 20px; font-weight: bold; font-size: 9.5px; }
    .dw { width: 42px; font-size: 8px; color: #8B8B8F; padding-top: 1px; }
    .entries { flex: 1; }
    .entry { display: flex; align-items: center; height: 18px; font-size: 8.5px; color: #56565A; }
    .badge { width: 110px; box-sizing: border-box; padding: 2px 6px; border-radius: 3px; color: #fff; font-size: 6px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 12px; }
    .time { flex: 1; }
    .dur { text-align: right; }
    .empty { color: #8B8B8F; font-size: 9.5px; margin-top: 12px; }
    .total { font-size: 11px; font-weight: bold; color: #2F6BFF; margin-top: 14px; }
  </style></head><body>
    <div class="brand"><img class="logo" src="${LOGO_DATA_URI}" /><span class="app">ShiftLog</span></div>
    <h1>${esc(label)}</h1>
    <div class="rule"></div>
    <div class="head"><span>DÍA</span><span>TRABAJO</span></div>
    ${days || '<div class="empty">Sin turnos en este periodo.</div>'}
    <div class="rule" style="margin-top: 11px"></div>
    <div class="total">Total: ${longDuration(totals.minutes)}</div>
  </body></html>`;
}

async function shareFile(uri: string, mimeType: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo.');
  await Sharing.shareAsync(uri, { mimeType });
}

export async function shareCsv(csv: string, label: string) {
  const file = new File(Paths.cache, `ShiftLog ${label.replace(/[^\w-]+/g, '_')} ${Date.now()}.csv`);
  file.create();
  await file.write(csv);
  await shareFile(file.uri, 'text/csv');
}

// A4 in points. Android has no page-margin option, so the page padding stands in for the margins.
const A4 = { width: 595, height: 842 };
const MARGIN = 57;

/**
 * "ShiftLog - Hostelería Noviembre 2026.pdf" for any day of that month; without a category (all of
 * them) it is "ShiftLog - Noviembre 2026.pdf". Characters that cannot go in a file name are replaced.
 */
export const pdfFileName = (anchor: string, category?: string) => {
  const month = formatMonth(anchor).replace(' de ', ' ');
  const name = category ? `${category.replace(/[\\/:*?"<>|]+/g, '-').trim()} ` : '';
  return `ShiftLog - ${name}${month}.pdf`;
};

/** Prints the report to a PDF named after its month and opens the share sheet. */
export async function sharePdf(html: string, fileName: string) {
  const page = html.replace('</style>', `body { padding: ${MARGIN}px; }</style>`);
  const { uri } = await Print.printToFileAsync({ html: page, ...A4 });
  const named = new File(Paths.cache, fileName);
  if (named.exists) named.delete();
  await new File(uri).move(named);
  await shareFile(named.uri, 'application/pdf');
}

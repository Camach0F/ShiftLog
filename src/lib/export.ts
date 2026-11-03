import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatDuration, formatMoney, resolveEntry, summarize } from './hours';
import type { AppState } from './types';

type Data = Pick<AppState, 'entries' | 'types' | 'jobs' | 'settings'>;
type Row = { date: string; job: string; name: string; start: string; end: string; breakMin: number; minutes: number; pay: number; note: string };

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
      name: r.type?.name ?? 'Horario propio',
      start: r.start,
      end: r.end,
      breakMin: r.breakMin,
      minutes: r.minutes,
      pay: r.rate ? (r.minutes / 60) * r.rate : 0,
      note: e.note,
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
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

export function buildHtml(data: Data, from: string, to: string, label: string, jobId: string | null): string {
  const rows = rowsFor(data, from, to, jobId);
  const totals = summarize(data, from, to, jobId);
  const { currency } = data.settings;
  const showPay = totals.pay > 0;
  const subtitle = jobId === null ? label : `${label} · ${data.jobs.find((j) => j.id === jobId)?.name ?? ''}`;

  const body = rows
    .map(
      (r) => `<tr><td>${esc(r.date)}</td><td>${esc(r.job)}</td><td>${esc(r.name)}</td><td>${r.start}–${r.end}</td><td>${r.breakMin} min</td><td class="n">${formatDuration(r.minutes)}</td>${
        showPay ? `<td class="n">${r.pay > 0 ? esc(formatMoney(r.pay, currency)) : ''}</td>` : ''
      }<td>${esc(r.note)}</td></tr>`,
    )
    .join('');

  const perJob = totals.jobRows
    .map(
      (r) =>
        `<tr><td>${esc(r.job.name)}</td><td class="n">${r.worked}</td><td class="n">${formatDuration(r.minutes)}</td><td class="n">${
          r.overtimeMinutes > 0 ? formatDuration(r.overtimeMinutes) : ''
        }</td>${showPay ? `<td class="n">${r.pay > 0 ? esc(formatMoney(r.pay, currency)) : ''}</td>` : ''}</tr>`,
    )
    .join('');

  return `<html><head><meta charset="utf-8" /><style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
    h1 { margin: 0 0 4px; } h2 { margin-top: 28px; font-size: 16px; }
    .sub { color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; }
    .n { text-align: right; white-space: nowrap; }
    .totals { font-size: 15px; margin: 12px 0; }
  </style></head><body>
    <h1>ShiftLog</h1>
    <div class="sub">${esc(subtitle)}</div>
    <div class="totals"><b>${formatDuration(totals.minutes)}</b> · ${totals.worked} turnos${
      totals.overtimeMinutes > 0 ? ` · ${formatDuration(totals.overtimeMinutes)} extra` : ''
    }${showPay ? ` · <b>${esc(formatMoney(totals.pay, currency))}</b>` : ''}</div>
    <h2>Por trabajo</h2>
    <table><tr><th>Trabajo</th><th class="n">Turnos</th><th class="n">Horas</th><th class="n">Extra</th>${showPay ? '<th class="n">Ingresos</th>' : ''}</tr>${perJob}</table>
    <h2>Detalle</h2>
    <table><tr><th>Fecha</th><th>Trabajo</th><th>Turno</th><th>Horario</th><th>Descanso</th><th class="n">Horas</th>${showPay ? '<th class="n">Ingresos</th>' : ''}<th>Nota</th></tr>${body}</table>
  </body></html>`;
}

async function shareFile(uri: string, mimeType: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible en este dispositivo.');
  await Sharing.shareAsync(uri, { mimeType, UTI: uti });
}

export async function shareCsv(csv: string, label: string) {
  const file = new File(Paths.cache, `ShiftLog ${label.replace(/[^\w-]+/g, '_')} ${Date.now()}.csv`);
  file.create();
  await file.write(csv);
  await shareFile(file.uri, 'text/csv', 'public.comma-separated-values-text');
}

export async function sharePdf(html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf', 'com.adobe.pdf');
}

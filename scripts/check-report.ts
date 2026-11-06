// Builds the PDF report for sample data and checks what ends up in it (the emulator test only
// sees that the share sheet opens). Run with: npx tsx scripts/check-report.ts
import assert from 'node:assert/strict';

import { buildCsv, buildHtml, inCategory, pdfFileName } from '../src/lib/report';
import type { AppState, Job } from '../src/lib/types';

const overtime = { enabled: false, dailyHours: null, weeklyHours: 40, multiplier: 1.5 };
const job = (id: string, name: string, categoryId: string): Job => ({
  id, name, color: '#2F6BFF', categoryId, payType: 'hourly', hourlyRate: 10, fixedRate: null, overtime,
});

const data: AppState = {
  categories: [{ id: 'c1', name: 'Teatro' }, { id: 'c2', name: 'Hostelería' }],
  jobs: [job('j1', 'Función', 'c1'), job('j2', 'Montaje', 'c1'), job('j3', 'Cocina', 'c2')],
  types: [
    { id: 't1', jobId: 'j1', name: 'Tarde', start: '18:00', end: '22:00', breakMin: 0 },
    { id: 't2', jobId: 'j2', name: 'Mañana', start: '09:00', end: '13:30', breakMin: 0 },
    { id: 't3', jobId: 'j3', name: 'Cena', start: '20:00', end: '23:00', breakMin: 0 },
  ],
  entries: [
    { id: 'e1', date: '2026-11-03', jobId: 'j1', typeId: 't1', note: '' },
    { id: 'e2', date: '2026-11-04', jobId: 'j2', typeId: 't2', note: '' },
    { id: 'e3', date: '2026-11-05', jobId: 'j3', typeId: 't3', note: '' },
  ],
  rotations: [], templates: [], eventTemplates: [], events: [],
  settings: { currency: '€', weekStartsOn: 1, quickAdd: false, checkUpdates: true },
};

const html = buildHtml(inCategory(data, { categoryId: 'c1' }), '2026-11-01', '2026-11-30', 'Noviembre de 2026', null);

// The brand header and the period are there
assert.match(html, /<span class="app">ShiftLog<\/span>/);
assert.match(html, /src="data:image\/png;base64,/);
assert.match(html, /<h1>Noviembre de 2026<\/h1>/);

// Only the jobs of the chosen category, each day with its hours
assert.match(html, /FUNCIÓN/);
assert.match(html, /MONTAJE/);
assert.doesNotMatch(html, /COCINA|Cocina/);
assert.match(html, /18:00 - 22:00/);

// No category line anywhere in the page
assert.doesNotMatch(html, /Categoría/);
assert.doesNotMatch(html, /Teatro/);

// The total is the last thing: nothing (no job names) comes after it
assert.match(html, /Total: 8 h 30 min/);
const afterTotal = html.slice(html.indexOf('Total:')).replace(/<[^>]*>/g, '').trim();
assert.equal(afterTotal, 'Total: 8 h 30 min');

// The file name still carries the category
assert.equal(pdfFileName('2026-11-15', 'Teatro'), 'ShiftLog - Teatro Noviembre 2026.pdf');
assert.equal(pdfFileName('2026-11-15', 'A|B'), 'ShiftLog - A-B Noviembre 2026.pdf');
assert.equal(pdfFileName('2026-11-15'), 'ShiftLog - Noviembre 2026.pdf');

// The CSV is not affected
assert.match(buildCsv(data, '2026-11-01', '2026-11-30', null), /Función/);

console.log('Report checks passed.');

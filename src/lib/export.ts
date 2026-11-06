import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// The report itself (HTML, CSV, file name) is built in report.ts, which has no Expo imports so it can be tested on its own.
export { buildCsv, buildHtml, inCategory, pdfFileName, type CategoryScope } from './report';

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

/** Prints the report to a PDF named after its month and opens the share sheet. */
export async function sharePdf(html: string, fileName: string) {
  const page = html.replace('</style>', `body { padding: ${MARGIN}px; }</style>`);
  const { uri } = await Print.printToFileAsync({ html: page, ...A4 });
  const named = new File(Paths.cache, fileName);
  if (named.exists) named.delete();
  await new File(uri).move(named);
  await shareFile(named.uri, 'application/pdf');
}

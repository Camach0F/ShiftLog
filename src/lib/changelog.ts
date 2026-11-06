/**
 * What each release changed, written for users. The "what's new" popup shows the entry of the
 * installed version once after an update, so add one here before tagging a release (the tag
 * v1.0.1 builds version 1.0.1). Newest first.
 */
export type Release = { version: string; changes: string[] };

export const CHANGELOG: Release[] = [
  {
    version: '1.0.1',
    changes: [
      'Categorías: agrupa tus trabajos y consulta en el Resumen un informe de cada una, con su propio PDF.',
      'Calendario: los eventos de la agenda (no los turnos) pueden copiarse al calendario del móvil y, desde ahí, a Google Calendar.',
      'PDF: ahora eliges el mes y la categoría, lleva el logo de ShiftLog y el archivo se llama «ShiftLog - Hostelería Noviembre 2026».',
      'Guía: un recorrido por la app para que no te pierdas. Sale al instalarla y puedes volver a verla en Ajustes.',
      'Actualizaciones: cuando sale una versión nueva te llega una notificación y, al abrir la app, aparece arriba un aviso con el botón Instalar.',
      'Novedades: tras actualizar, la app te cuenta qué ha cambiado. Puedes volver a verlo en Ajustes.',
    ],
  },
  {
    version: '1.0.0',
    changes: ['Primera versión de ShiftLog: agenda, turnos, resumen de horas, copia en Google Drive y avisos de versiones nuevas.'],
  },
];

/** The notes of exactly this version, or null if none were written. */
export const releaseFor = (version: string): Release | null => CHANGELOG.find((r) => r.version === version) ?? null;

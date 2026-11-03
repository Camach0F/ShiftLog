/**
 * Shapes what the user types into an "HH:mm" field with the number keyboard: "730" -> "7:30",
 * "0730" -> "07:30". Hours above 23 are read as a one-digit hour followed by the minutes.
 */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  const twoDigitHour = Number(digits.slice(0, 2)) <= 23;
  const hours = twoDigitHour ? digits.slice(0, 2) : digits.slice(0, 1);
  return `${hours}:${digits.slice(hours.length)}`;
}

/** "20261103" -> "2026-11-03", adding the dashes as the digits come in. */
export function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

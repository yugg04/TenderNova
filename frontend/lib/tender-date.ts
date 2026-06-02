export function parseTenderDeadline(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'null') return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dayFirst = raw.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b(?:.*?\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (!dayFirst) return null;

  const day = Number(dayFirst[1]);
  const month = Number(dayFirst[2]) - 1;
  const year = normalizeYear(Number(dayFirst[3]));
  let hour = Number(dayFirst[4] ?? 0);
  const minute = Number(dayFirst[5] ?? 0);
  const meridiem = dayFirst[6]?.toUpperCase();

  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const parsed = new Date(year, month, day, hour, minute);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function normalizeYear(year: number) {
  if (year < 100) return year >= 70 ? 1900 + year : 2000 + year;
  return year;
}

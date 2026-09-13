/**
 * Construirea fișierelor CSV pentru Google Sheets.
 *
 * Regulile de citat sunt cele din RFC 4180: ghilimelele se dublează, iar orice
 * câmp care conține virgulă, ghilimele sau rând nou se pune între ghilimele.
 * Fără asta, o poveste cu o virgulă în ea ar rupe toate coloanele de după.
 */
export type CsvValue = string | number | boolean | Date | null | undefined;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // Formatul pe care Google Sheets îl recunoaște ca dată fără să i se explice.
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value === 'boolean') return value ? 'da' : 'nu';

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n');
}

export function csvResponse(csv: string, filename: string, withBom = false): Response {
  // Excel are nevoie de marcaj ca să citească diacriticele; Sheets nu.
  const body = withBom ? '﻿' + csv : csv;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

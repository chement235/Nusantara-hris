export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

/** BOM UTF-8 agar angka/teks Indonesia terbaca benar di Excel. */
export function csvDocument(rows: unknown[][]): string {
  return `\uFEFF${rows.map((row) => csvRow(row)).join("\r\n")}\r\n`;
}

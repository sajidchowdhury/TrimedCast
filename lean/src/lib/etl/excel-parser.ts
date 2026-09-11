// ============================================
// TrimedCast LEAN — Excel parser (xlsx/SheetJS)
// Accepts the client's wide format:
//   Pic No | Item | Color & Details | Order QTY | Ordered On |
//   Send On | Send By Sea/Air | Received On | Jan..Dec
// ============================================

import * as XLSX from 'xlsx';

export interface ParsedExcel {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  preview: Record<string, unknown>[];
  sheetName: string;
}

/** Parse an Excel/CSV buffer into headers + rows. */
export function parseExcelFile(buffer: Buffer, fileName: string): ParsedExcel {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: true,
    cellStyles: false,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error('No worksheet found in the file');

  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (rawData.length === 0) {
    throw new Error('No data rows found. Ensure the first row contains headers.');
  }

  const headers = Object.keys(rawData[0]).map(h => h.trim()).filter(h => h.length > 0);

  const rows: Record<string, unknown>[] = [];
  for (const rawRow of rawData) {
    const row: Record<string, unknown> = {};
    for (const header of headers) {
      let value = rawRow[header];

      // Excel date serial numbers -> ISO date string
      if (typeof value === 'number' && value > 25000 && value < 100000) {
        const parsed = XLSX.SSF.parse_date_code(value);
        if (parsed && parsed.y >= 2000 && parsed.y <= 2050) {
          value = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
      }

      if (typeof value === 'string') {
        value = value.trim();
        if (value !== '' && !isNaN(Number(value)) && isFinite(Number(value))) {
          const numVal = Number(value);
          // keep SKU-like leading-zero codes as strings
          if (!(value.startsWith('0') && value.length > 1 && !value.includes('.'))) {
            value = numVal;
          }
        }
      }

      if (value === '' || value === undefined) value = null;
      row[header] = value;
    }
    rows.push(row);
  }

  const filtered = rows.filter(r => Object.values(r).some(v => v !== null));
  return {
    headers,
    rows: filtered,
    totalRows: filtered.length,
    preview: filtered.slice(0, 5),
    sheetName,
  };
}

export function isValidFileType(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ['xlsx', 'xls', 'csv'].includes(ext || '');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

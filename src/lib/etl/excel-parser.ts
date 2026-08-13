// ============================================
// TrimedCast ETL - Excel/CSV File Parser
// ============================================

import * as XLSX from 'xlsx';

export interface ParsedExcel {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  preview: Record<string, unknown>[];
  sheetName: string;
  detectedFormat: string;
}

/**
 * Parse an Excel or CSV file from a Buffer
 */
export function parseExcelFile(buffer: Buffer, fileName: string): ParsedExcel {
  const isCSV = fileName.toLowerCase().endsWith('.csv');
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: true,
    cellStyles: false,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }

  // Convert to JSON with headers
  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    blankrows: false,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  if (rawData.length === 0) {
    throw new Error('No data rows found in the file. Ensure the first row contains headers.');
  }

  // Extract headers from first row keys
  const headers = Object.keys(rawData[0]).map(h => h.trim()).filter(h => h.length > 0);

  // Process and normalize each row
  const rows: Record<string, unknown>[] = [];
  for (const rawRow of rawData) {
    const row: Record<string, unknown> = {};
    for (const header of headers) {
      let value = rawRow[header];

      // Handle Excel date serial numbers
      if (typeof value === 'number' && value > 25000 && value < 100000) {
        // Likely an Excel date serial number - try to convert
        // Excel dates: days since Jan 1, 1900 (with 1900 leap year bug)
        // Only convert if it looks like a date (between 1970-01-01 and 2050-01-01)
        const possibleDate = XLSX.SSF.parse_date_code(value);
        if (possibleDate && possibleDate.y >= 1970 && possibleDate.y <= 2050) {
          value = `${possibleDate.y}-${String(possibleDate.m).padStart(2, '0')}-${String(possibleDate.d).padStart(2, '0')}`;
        }
      }

      // Trim string values
      if (typeof value === 'string') {
        value = value.trim();
        // Convert numeric strings to numbers where appropriate
        if (value !== '' && !isNaN(Number(value)) && isFinite(Number(value))) {
          // Only auto-convert if it's clearly a number (not a SKU-like string)
          const numVal = Number(value);
          if (numVal > 0 || value === '0' || value === '0.0') {
            // Keep as string if it looks like a code (starts with 0, has leading zeros)
            if (value.startsWith('0') && value.length > 1 && !value.includes('.')) {
              // Likely a code, keep as string
            } else {
              value = numVal;
            }
          }
        }
      }

      // Replace empty strings with null
      if (value === '' || value === null || value === undefined) {
        value = null;
      }

      row[header] = value;
    }
    rows.push(row);
  }

  // Filter out completely empty rows
  const filteredRows = rows.filter(row =>
    Object.values(row).some(v => v !== null && v !== undefined)
  );

  // Generate preview (first 5 rows)
  const preview = filteredRows.slice(0, 5);

  // Detect format
  const detectedFormat = isCSV ? 'CSV' : 'XLSX';

  return {
    headers,
    rows: filteredRows,
    totalRows: filteredRows.length,
    preview,
    sheetName,
    detectedFormat,
  };
}

/**
 * Parse just the headers from an Excel file (for quick preview)
 */
export function parseExcelHeaders(buffer: Buffer, fileName: string): { headers: string[]; preview: Record<string, unknown>[]; totalRows: number } {
  const result = parseExcelFile(buffer, fileName);
  return {
    headers: result.headers,
    preview: result.preview,
    totalRows: result.totalRows,
  };
}

/**
 * Validate file type
 */
export function isValidFileType(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ['xlsx', 'xls', 'csv'].includes(ext || '');
}

/**
 * Get max file size in bytes (10MB)
 */
export function getMaxFileSize(): number {
  return 10 * 1024 * 1024;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

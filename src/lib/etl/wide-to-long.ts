// ============================================
// TrimedCast LEAN — Wide-to-Long transformer
// The client's Excel is WIDE: one row per SKU with 12 monthly columns.
// TrimedCast needs LONG: one row per SKU-month.
// This module melts Jan..Dec into (sale_date, qty_sold) pairs and
// extracts Product, Purchase, and Inventory records in one pass.
// ============================================

/** A recognized column in the client's wide Excel. */
export const CLIENT_COLUMNS = {
  picNo: ['pic no', 'picno', 'pic no.', 'pic #', 'pic'],
  item: ['item', 'product', 'product name', 'item name', 'description'],
  color: ['color & details', 'color and details', 'color', 'color/details', 'variant', 'colour & details'],
  orderQty: ['order qty', 'order quantity', 'ordered qty', 'qty'],
  orderedOn: ['ordered on', 'order date', 'ordered'],
  sendOn: ['send on', 'send date', 'dispatch date', 'shipped on'],
  sendBy: ['send by sea / air', 'send by', 'send by sea/air', 'ship by', 'shipping mode', 'mode'],
  receivedOn: ['received on', 'received', 'receipt date'],
  monthly: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
} as const;

export interface MonthHeader {
  header: string;
  monthIndex: number; // 1-12
}

/** Find the actual header in the sheet that matches a logical column. */
export function findHeader(headers: string[], candidates: readonly string[]): string | null {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const cand of candidates) {
    const idx = lower.findIndex(h => h === cand);
    if (idx >= 0) return headers[idx];
  }
  // fuzzy contains match
  for (const cand of candidates) {
    const idx = lower.findIndex(h => h.includes(cand) || cand.includes(h));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

/** Detect all monthly columns (Jan..Dec) in the header row. */
export function detectMonthlyHeaders(headers: string[]): MonthHeader[] {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const found: MonthHeader[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    // exact short month or "january" etc
    const mIdx = months.findIndex(m => h === m || h.startsWith(m) || h.includes(m));
    if (mIdx >= 0 && !found.some(f => f.monthIndex === mIdx + 1)) {
      found.push({ header: headers[i], monthIndex: mIdx + 1 });
    }
  }
  return found.sort((a, b) => a.monthIndex - b.monthIndex);
}

// --- Output types (long format) ---

export interface ProductRecord {
  skuCode: string;
  productName: string;
  colorDetails: string | null;
}

export interface SaleRecord {
  skuCode: string;
  year: number;
  month: number;       // 1-12
  saleDate: string;    // ISO yyyy-mm-01
  qtySold: number;
}

export interface PurchaseRecord {
  skuCode: string;
  orderQty: number;
  orderedOn: string | null;
  sendOn: string | null;
  receivedOn: string | null;
  shipmentMode: string; // 'sea' | 'air'
  actualLeadTimeDays: number | null;
}

export interface TransformResult {
  products: ProductRecord[];
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  warnings: string[];
  // mapping diagnostics for UI display
  mapping: {
    picNo: string | null;
    item: string | null;
    color: string | null;
    orderQty: string | null;
    orderedOn: string | null;
    sendOn: string | null;
    sendBy: string | null;
    receivedOn: string | null;
    monthly: MonthHeader[];
  };
}

/** Normalize a shipment mode string to 'sea' | 'air'. */
function normalizeMode(raw: unknown): string {
  if (raw == null) return 'sea';
  const s = String(raw).toLowerCase().trim();
  if (s.includes('air')) return 'air';
  return 'sea';
}

/** Coerce a value to a number, defaulting to 0. */
function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return isNaN(n) || !isFinite(n) ? 0 : n;
}

/** Coerce a value to an ISO date string (or null). */
function toDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  // already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/yyyy or mm/dd/yyyy — assume dd/mm/yyyy (BD format)
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    let year = y.length === 2 ? 2000 + Number(y) : Number(y);
    // Heuristic: if first part > 12 it's a day (dd/mm/yyyy). BD uses dd/mm/yyyy.
    const dd = Number(d);
    const mm = Number(mo);
    if (dd > 12) {
      return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    // ambiguous — assume dd/mm/yyyy (BD default)
    return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return null;
}

function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return null;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

/**
 * The year for the monthly columns. The client's workbook title may
 * indicate the year (e.g. "ND May 24" => 2024). We default to the year
 * of the "Ordered On" date if present, else the current year minus 1.
 */
function inferYear(orderedOn: string | null, defaultYear: number): number {
  if (orderedOn) {
    const y = Number(orderedOn.slice(0, 4));
    if (!isNaN(y) && y > 2000 && y < 2100) return y;
  }
  return defaultYear;
}

/**
 * Transform the client's wide Excel rows into long-format records.
 * @param rows       Parsed wide rows from excel-parser
 * @param headers    Header list
 * @param dataYear   The year to attribute monthly sales to (user-configurable)
 */
export function transformWideToLong(
  rows: Record<string, unknown>[],
  headers: string[],
  dataYear: number,
): TransformResult {
  const mapping = {
    picNo: findHeader(headers, CLIENT_COLUMNS.picNo),
    item: findHeader(headers, CLIENT_COLUMNS.item),
    color: findHeader(headers, CLIENT_COLUMNS.color),
    orderQty: findHeader(headers, CLIENT_COLUMNS.orderQty),
    orderedOn: findHeader(headers, CLIENT_COLUMNS.orderedOn),
    sendOn: findHeader(headers, CLIENT_COLUMNS.sendOn),
    sendBy: findHeader(headers, CLIENT_COLUMNS.sendBy),
    receivedOn: findHeader(headers, CLIENT_COLUMNS.receivedOn),
    monthly: detectMonthlyHeaders(headers),
  };

  const warnings: string[] = [];
  if (!mapping.picNo) warnings.push('Could not find the "Pic No" (SKU) column.');
  if (!mapping.item) warnings.push('Could not find the "Item" (product name) column.');
  if (mapping.monthly.length === 0) warnings.push('No monthly sales columns (Jan–Dec) detected.');

  const products: ProductRecord[] = [];
  const sales: SaleRecord[] = [];
  const purchases: PurchaseRecord[] = [];
  const seenSkus = new Set<string>();

  for (const row of rows) {
    const skuCode = mapping.picNo ? String(row[mapping.picNo] ?? '').trim() : '';
    if (!skuCode) continue;

    const productName = mapping.item ? String(row[mapping.item] ?? skuCode).trim() : skuCode;
    const colorDetails = mapping.color ? String(row[mapping.color] ?? '').trim() || null : null;

    if (!seenSkus.has(skuCode)) {
      products.push({ skuCode, productName, colorDetails });
      seenSkus.add(skuCode);
    }

    // --- Purchase record (one per row) ---
    const orderedOn = mapping.orderedOn ? toDate(row[mapping.orderedOn]) : null;
    const sendOn = mapping.sendOn ? toDate(row[mapping.sendOn]) : null;
    const receivedOn = mapping.receivedOn ? toDate(row[mapping.receivedOn]) : null;
    const orderQty = mapping.orderQty ? toNumber(row[mapping.orderQty]) : 0;
    const shipmentMode = normalizeMode(mapping.sendBy ? row[mapping.sendBy] : 'sea');
    const actualLeadTimeDays = daysBetween(orderedOn, receivedOn);

    if (orderQty > 0 || orderedOn) {
      purchases.push({
        skuCode,
        orderQty,
        orderedOn,
        sendOn,
        receivedOn,
        shipmentMode,
        actualLeadTimeDays,
      });
    }

    // --- Sales records (melt monthly columns) ---
    const year = inferYear(orderedOn, dataYear);
    for (const mh of mapping.monthly) {
      const qty = toNumber(row[mh.header]);
      if (qty > 0) {
        sales.push({
          skuCode,
          year,
          month: mh.monthIndex,
          saleDate: `${year}-${String(mh.monthIndex).padStart(2, '0')}-01`,
          qtySold: qty,
        });
      }
    }
  }

  return { products, sales, purchases, warnings, mapping };
}

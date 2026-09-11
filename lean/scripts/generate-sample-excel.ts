// ============================================
// TrimedCast LEAN — sample Excel generator
// Run: bun scripts/generate-sample-excel.ts
// Produces ./sample_client_sales.xlsx in the client's wide format
// (Pic No, Item, Color & Details, Order QTY, dates, Jan-Dec).
// ============================================

import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

const rows = [
  { 'Pic No': 'Pic 10', 'Item': 'Kit Signal Light With Parking', 'Color & Details': 'Yellow + Blue', 'Order QTY': 300, 'Ordered On': '10/06/2024', 'Send On': '01/07/2024', 'Send By Sea / Air': 'by sea', 'Received On': '11/09/2024', 'Jan': 45, 'Feb': 35, 'Mar': 65, 'Apr': 68, 'May': 78, 'Jun': 88, 'Jul': 98, 'Aug': 108, 'Sep': 118, 'Oct': 128, 'Nov': 138, 'Dec': 148 },
  { 'Pic No': 'Pic 11', 'Item': 'Kit Signal Light With Parking', 'Color & Details': 'Yellow + Blue', 'Order QTY': 300, 'Ordered On': '10/06/2024', 'Send On': '01/07/2024', 'Send By Sea / Air': 'by sea', 'Received On': '11/09/2024', 'Jan': 40, 'Feb': 50, 'Mar': 60, 'Apr': 70, 'May': 80, 'Jun': 90, 'Jul': 100, 'Aug': 110, 'Sep': 120, 'Oct': 130, 'Nov': 140, 'Dec': 150 },
  { 'Pic No': 'Pic 164', 'Item': '2wear Flasher', 'Color & Details': '', 'Order QTY': 3000, 'Ordered On': '10/06/2024', 'Send On': '01/07/2024', 'Send By Sea / Air': 'by sea', 'Received On': '11/09/2024', 'Jan': 200, 'Feb': 220, 'Mar': 240, 'Apr': 260, 'May': 280, 'Jun': 300, 'Jul': 320, 'Aug': 340, 'Sep': 360, 'Oct': 380, 'Nov': 400, 'Dec': 420 },
  { 'Pic No': 'Pic 13', 'Item': 'Indicator Set', 'Color & Details': 'Red 500; Black 300', 'Order QTY': 800, 'Ordered On': '15/03/2024', 'Send On': '01/04/2024', 'Send By Sea / Air': 'by air', 'Received On': '20/06/2024', 'Jan': 30, 'Feb': 28, 'Mar': 50, 'Apr': 55, 'May': 60, 'Jun': 65, 'Jul': 70, 'Aug': 75, 'Sep': 80, 'Oct': 85, 'Nov': 90, 'Dec': 95 },
  { 'Pic No': 'Pic 18', 'Item': 'Flash', 'Color & Details': 'Yellow 1200; Red 400; Blue 400', 'Order QTY': 2000, 'Ordered On': '10/06/2024', 'Send On': '01/07/2024', 'Send By Sea / Air': 'by sea', 'Received On': '11/09/2024', 'Jan': 150, 'Feb': 160, 'Mar': 170, 'Apr': 180, 'May': 190, 'Jun': 200, 'Jul': 210, 'Aug': 220, 'Sep': 230, 'Oct': 240, 'Nov': 250, 'Dec': 260 },
  { 'Pic No': 'Pic 19', 'Item': 'Non Flash', 'Color & Details': 'Yellow 1200; Red 400; Blue 400', 'Order QTY': 2000, 'Ordered On': '10/06/2024', 'Send On': '01/07/2024', 'Send By Sea / Air': 'by sea', 'Received On': '11/09/2024', 'Jan': 140, 'Feb': 150, 'Mar': 160, 'Apr': 170, 'May': 180, 'Jun': 190, 'Jul': 200, 'Aug': 210, 'Sep': 220, 'Oct': 230, 'Nov': 240, 'Dec': 250 },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'ND May 24');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync('./sample_client_sales.xlsx', buf);
console.log('✅ Created ./sample_client_sales.xlsx with', rows.length, 'SKUs');
console.log('   Upload it via the TrimedCast dashboard → Upload Excel page.');

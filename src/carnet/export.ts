import jsPDF from 'jspdf';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - module augmentation varies by bundler
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CarnetItem } from './types';

function formatGbp(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function exportCarnetAsPdf(items: CarnetItem[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;

  doc.setFontSize(18);
  doc.text('CarnetAI — ATA Carnet Packing List', marginX, 48);

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-GB')}`,
    marginX,
    66
  );

  const head = [[
    'Item Description',
    'Category',
    'Qty',
    'Value (GBP)',
    'Country of Origin',
    'Weight (kg)',
    'Serial / Identifier',
    'Notes',
  ]];
  const body = items.map((it) => [
    it.itemDescription,
    it.category,
    String(it.quantity),
    formatGbp(it.valueGbp),
    it.countryOfOrigin || '',
    it.weightKg === undefined ? '' : String(it.weightKg),
    it.serialNumber || '',
    it.notes || '',
  ]);

  autoTable(doc, {
    startY: 88,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
    headStyles: { fillColor: [24, 24, 27] },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 85 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 70, halign: 'right' },
      4: { cellWidth: 75 },
      5: { cellWidth: 60, halign: 'right' },
      6: { cellWidth: 90 },
      7: { cellWidth: 115 },
    },
    margin: { left: marginX, right: marginX },
  });

  doc.save('carnetai-packing-list.pdf');
}

export function exportCarnetAsExcel(items: CarnetItem[]) {
  const rows = items.map((it) => ({
    'Item Description': it.itemDescription,
    Category: it.category,
    Quantity: it.quantity,
    'Value (GBP)': it.valueGbp,
    'Country of Origin': it.countryOfOrigin,
    'Weight (kg)': it.weightKg ?? '',
    'Serial / Identifier': it.serialNumber,
    Notes: it.notes,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Carnet List');
  XLSX.writeFile(wb, 'carnetai-packing-list.xlsx');
}


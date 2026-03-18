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

  const head = [['Item Name', 'Category', 'Qty', 'Estimated Value (£)', 'Notes']];
  const body = items.map((it) => [
    it.itemName,
    it.category,
    String(it.quantity),
    formatGbp(it.estimatedValueGbp),
    it.notes || '',
  ]);

  autoTable(doc, {
    startY: 88,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
    headStyles: { fillColor: [24, 24, 27] },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 90 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 90, halign: 'right' },
      4: { cellWidth: 160 },
    },
    margin: { left: marginX, right: marginX },
  });

  doc.save('carnetai-packing-list.pdf');
}

export function exportCarnetAsExcel(items: CarnetItem[]) {
  const rows = items.map((it) => ({
    'Item Name': it.itemName,
    Category: it.category,
    Quantity: it.quantity,
    'Estimated Value (£)': it.estimatedValueGbp,
    Notes: it.notes,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Carnet List');
  XLSX.writeFile(wb, 'carnetai-packing-list.xlsx');
}


import type { CarnetItem } from './types';

export type ItemValidation = {
  itemId: string;
  blockers: string[];
  warnings: string[];
};

export type CarnetValidationSummary = {
  byId: Record<string, ItemValidation>;
  blockerCount: number;
  warningCount: number;
  readyToExport: boolean;
};

function hasMeaningfulValue(v?: string) {
  return Boolean(v && v.trim().length > 0);
}

function hasRealSerial(serial?: string) {
  if (!serial) return false;
  const s = serial.trim().toLowerCase();
  return s !== '' && s !== 'n/a' && s !== 'no serial';
}

export function validateCarnetItems(items: CarnetItem[]): CarnetValidationSummary {
  const byId: Record<string, ItemValidation> = {};
  let blockerCount = 0;
  let warningCount = 0;

  for (const item of items) {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!hasMeaningfulValue(item.itemDescription)) blockers.push('Item description is required.');
    if (!Number.isFinite(item.quantity) || item.quantity < 1)
      blockers.push('Quantity must be at least 1.');
    if (!Number.isFinite(item.valueGbp) || item.valueGbp < 0)
      blockers.push('Value (GBP) must be 0 or more.');
    if (!hasMeaningfulValue(item.countryOfOrigin))
      blockers.push('Country of origin is required.');
    if (!hasMeaningfulValue(item.serialNumber))
      blockers.push('Serial / Identifier is required (use N/A if unavailable).');

    if (item.valueGbp >= 500 && !hasRealSerial(item.serialNumber)) {
      warnings.push('High-value item should include an actual serial number if available.');
    }
    if (!hasMeaningfulValue(item.notes)) {
      warnings.push('Add notes for clearer customs descriptions (recommended).');
    }

    blockerCount += blockers.length;
    warningCount += warnings.length;
    byId[item.id] = { itemId: item.id, blockers, warnings };
  }

  return {
    byId,
    blockerCount,
    warningCount,
    readyToExport: blockerCount === 0 && items.length > 0,
  };
}

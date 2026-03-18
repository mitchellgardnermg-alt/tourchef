import type { CarnetItem, CarnetCategory } from './types';

export type AiExtractResult = {
  items: CarnetItem[];
  warnings: string[];
};

const CATEGORIES: CarnetCategory[] = [
  'Kitchen',
  'Production',
  'Instruments',
  'Audio',
  'Lighting',
  'Backline',
  'IT',
  'Other',
];

export function normalizeAiItems(raw: unknown): AiExtractResult {
  const warnings: string[] = [];
  const items: CarnetItem[] = [];

  const asObj = (v: any) => (v && typeof v === 'object' ? v : null);
  const root = asObj(raw);
  const arr = Array.isArray(root?.items) ? root!.items : Array.isArray(raw) ? (raw as any[]) : null;

  if (!arr) {
    return { items: [], warnings: ['Model output did not include an items array.'] };
  }

  for (const it of arr) {
    const o = asObj(it);
    if (!o) continue;
    const itemName = typeof o.itemName === 'string' ? o.itemName.trim() : '';
    if (!itemName) continue;

    const categoryRaw = typeof o.category === 'string' ? o.category.trim() : 'Other';
    const category = (CATEGORIES.includes(categoryRaw as any)
      ? (categoryRaw as CarnetCategory)
      : 'Other') as CarnetCategory;

    const quantity = Number.isFinite(Number(o.quantity)) ? Math.max(0, Math.round(Number(o.quantity))) : 1;
    const estimatedValueGbp = Number.isFinite(Number(o.estimatedValueGbp))
      ? Math.max(0, Math.round(Number(o.estimatedValueGbp)))
      : 0;
    const notes = typeof o.notes === 'string' ? o.notes : '';

    items.push({
      id: globalThis.crypto?.randomUUID?.() ?? `ai_${items.length}_${Date.now()}`,
      itemName,
      category,
      quantity,
      estimatedValueGbp,
      notes,
    });
  }

  if (items.length === 0) warnings.push('No valid items could be parsed from model output.');
  return { items, warnings };
}


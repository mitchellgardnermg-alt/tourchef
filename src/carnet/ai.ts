import type { CarnetItem, CarnetCategory } from './types';

export type AiExtractResult = {
  items: CarnetItem[];
  warnings: string[];
};

const CATEGORIES: CarnetCategory[] = [
  'Kitchen Equipment',
  'Utensils',
  'Electrical Equipment',
  'Furniture',
  'Production Equipment',
  'Instruments',
  'Audio Equipment',
  'Lighting',
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
    const itemDescription =
      typeof o.itemDescription === 'string'
        ? o.itemDescription.trim()
        : typeof o.itemName === 'string'
          ? o.itemName.trim()
          : typeof o.item_name === 'string'
            ? o.item_name.trim()
            : '';
    if (!itemDescription) continue;

    const categoryRaw = typeof o.category === 'string' ? o.category.trim() : 'Other';
    const category = (CATEGORIES.includes(categoryRaw as any)
      ? (categoryRaw as CarnetCategory)
      : 'Other') as CarnetCategory;

    const quantity = Number.isFinite(Number(o.quantity))
      ? Math.max(0, Math.round(Number(o.quantity)))
      : 1;

    const valueGbp = Number.isFinite(Number(o.valueGbp))
      ? Math.max(0, Math.round(Number(o.valueGbp)))
      : Number.isFinite(Number(o.estimatedValueGbp))
        ? Math.max(0, Math.round(Number(o.estimatedValueGbp)))
        : Number.isFinite(Number(o.estimated_value_gbp))
          ? Math.max(0, Math.round(Number(o.estimated_value_gbp)))
          : 0;

    const countryOfOrigin =
      typeof o.countryOfOrigin === 'string' ? o.countryOfOrigin.trim() : '';

    const weightKgRaw = o.weightKg;
    const weightKg =
      weightKgRaw === null || weightKgRaw === undefined || weightKgRaw === ''
        ? undefined
        : Number.isFinite(Number(weightKgRaw))
          ? Math.max(0, Number(weightKgRaw))
          : undefined;

    const serialNumber =
      typeof o.serialNumber === 'string' && o.serialNumber.trim()
        ? o.serialNumber.trim()
        : 'N/A';

    const notes = typeof o.notes === 'string' ? o.notes : '';

    const aiConfidenceRaw =
      o.aiConfidence ??
      o.confidence ??
      o.extraction_confidence ??
      o.confidence_score;
    const aiConfidence = Number.isFinite(Number(aiConfidenceRaw))
      ? Math.max(0, Math.min(100, Math.round(Number(aiConfidenceRaw))))
      : undefined;

    const aiEvidence =
      typeof o.aiEvidence === 'string'
        ? o.aiEvidence.trim()
        : typeof o.evidence === 'string'
          ? o.evidence.trim()
          : typeof o.extraction_evidence === 'string'
            ? o.extraction_evidence.trim()
            : undefined;

    const aiValueEstimated =
      typeof o.aiValueEstimated === 'boolean'
        ? o.aiValueEstimated
        : typeof o.value_estimated === 'boolean'
          ? o.value_estimated
          : typeof o.is_value_estimated === 'boolean'
            ? o.is_value_estimated
            : undefined;

    const aiValueEstimateReason =
      typeof o.aiValueEstimateReason === 'string'
        ? o.aiValueEstimateReason.trim()
        : typeof o.value_estimation_reason === 'string'
          ? o.value_estimation_reason.trim()
          : typeof o.value_estimate_reason === 'string'
            ? o.value_estimate_reason.trim()
            : undefined;

    items.push({
      id: globalThis.crypto?.randomUUID?.() ?? `ai_${items.length}_${Date.now()}`,
      itemDescription,
      category,
      quantity,
      valueGbp,
      countryOfOrigin,
      weightKg,
      serialNumber,
      notes,
      aiConfidence,
      aiEvidence,
      aiValueEstimated,
      aiValueEstimateReason,
    });
  }

  if (items.length === 0) warnings.push('No valid items could be parsed from model output.');
  return { items, warnings };
}


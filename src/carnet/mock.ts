import type { CarnetCategory, CarnetItem, UploadedImage } from './types';

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

const SAMPLE_ITEMS: Array<{
  itemDescription: string;
  category: CarnetCategory;
  minQty: number;
  maxQty: number;
  minValue: number;
  maxValue: number;
  countryOfOrigin: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  serialNumber: string;
  notes: string;
}> = [
  {
    itemDescription: 'Stainless Steel 5L Saucepan',
    category: 'Kitchen Equipment',
    minQty: 2,
    maxQty: 8,
    minValue: 18,
    maxValue: 55,
    countryOfOrigin: 'China',
    minWeightKg: 0.6,
    maxWeightKg: 1.4,
    serialNumber: 'No serial',
    notes: 'Assorted sizes',
  },
  {
    itemDescription: 'Portable Gas Burner (Single Ring)',
    category: 'Kitchen Equipment',
    minQty: 1,
    maxQty: 3,
    minValue: 45,
    maxValue: 140,
    countryOfOrigin: 'China',
    minWeightKg: 1.8,
    maxWeightKg: 4.2,
    serialNumber: 'No serial',
    notes: 'Portable single ring',
  },
  {
    itemDescription: 'Chef Knife Set (8-piece) + Sharpening Steel',
    category: 'Kitchen Equipment',
    minQty: 1,
    maxQty: 2,
    minValue: 120,
    maxValue: 380,
    countryOfOrigin: 'Germany',
    minWeightKg: 1.0,
    maxWeightKg: 2.5,
    serialNumber: 'N/A',
    notes: 'Includes sharpening steel',
  },
  {
    itemDescription: 'Food Processor (with bowl + blade attachments)',
    category: 'Kitchen Equipment',
    minQty: 1,
    maxQty: 2,
    minValue: 95,
    maxValue: 320,
    countryOfOrigin: 'China',
    minWeightKg: 3.5,
    maxWeightKg: 7.5,
    serialNumber: 'N/A',
    notes: 'Bowl + blade attachments',
  },
  {
    itemDescription: 'Extension Cable 25m (UK Plug, 13A)',
    category: 'Production Equipment',
    minQty: 4,
    maxQty: 16,
    minValue: 12,
    maxValue: 35,
    countryOfOrigin: 'UK',
    minWeightKg: 2.0,
    maxWeightKg: 4.5,
    serialNumber: 'N/A',
    notes: 'UK plug',
  },
  {
    itemDescription: 'Label Printer (thermal) + spare rolls',
    category: 'Production Equipment',
    minQty: 1,
    maxQty: 2,
    minValue: 65,
    maxValue: 210,
    countryOfOrigin: 'China',
    minWeightKg: 0.8,
    maxWeightKg: 2.2,
    serialNumber: 'N/A',
    notes: 'With spare rolls',
  },
  {
    itemDescription: 'Wireless Microphone (Handheld) + Receiver',
    category: 'Audio Equipment',
    minQty: 2,
    maxQty: 6,
    minValue: 180,
    maxValue: 640,
    countryOfOrigin: 'Malaysia',
    minWeightKg: 0.4,
    maxWeightKg: 1.2,
    serialNumber: 'See Notes',
    notes: 'Receivers in rack case',
  },
  {
    itemDescription: 'DI Box (active)',
    category: 'Audio Equipment',
    minQty: 4,
    maxQty: 12,
    minValue: 25,
    maxValue: 140,
    countryOfOrigin: 'China',
    minWeightKg: 0.3,
    maxWeightKg: 0.8,
    serialNumber: 'N/A',
    notes: 'Active mix',
  },
  {
    itemDescription: 'LED Par Can (DMX capable)',
    category: 'Lighting',
    minQty: 6,
    maxQty: 24,
    minValue: 45,
    maxValue: 220,
    countryOfOrigin: 'China',
    minWeightKg: 1.2,
    maxWeightKg: 3.0,
    serialNumber: 'N/A',
    notes: 'DMX capable',
  },
  {
    itemDescription: 'Tripod Stand (aluminium)',
    category: 'Production Equipment',
    minQty: 2,
    maxQty: 8,
    minValue: 18,
    maxValue: 85,
    countryOfOrigin: 'China',
    minWeightKg: 1.1,
    maxWeightKg: 2.6,
    serialNumber: 'N/A',
    notes: 'Lightweight aluminium',
  },
  {
    itemDescription: 'Electric Guitar (in hard case)',
    category: 'Instruments',
    minQty: 1,
    maxQty: 3,
    minValue: 350,
    maxValue: 2400,
    countryOfOrigin: 'USA',
    minWeightKg: 3.0,
    maxWeightKg: 6.0,
    serialNumber: 'Required (if present)',
    notes: 'In hard case',
  },
  {
    itemDescription: 'Guitar Pedalboard (incl. power supply)',
    category: 'Instruments',
    minQty: 1,
    maxQty: 2,
    minValue: 260,
    maxValue: 1400,
    countryOfOrigin: 'UK',
    minWeightKg: 2.0,
    maxWeightKg: 7.0,
    serialNumber: 'N/A',
    notes: 'Power supply included',
  },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateMockCarnetItems(images: UploadedImage[]): CarnetItem[] {
  const seed =
    images
      .map((img) => img.file.name)
      .join('|')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + images.length * 997;

  const rng = mulberry32(seed || 1234);

  const baseCount = clampInt(6 + images.length * 2 + rng() * 6, 8, 20);
  const chosen = new Set<number>();
  const items: CarnetItem[] = [];

  while (items.length < baseCount && chosen.size < SAMPLE_ITEMS.length) {
    const idx = Math.floor(rng() * SAMPLE_ITEMS.length);
    if (chosen.has(idx)) continue;
    chosen.add(idx);

    const s = SAMPLE_ITEMS[idx]!;
    const quantity = clampInt(
      s.minQty + rng() * (s.maxQty - s.minQty),
      s.minQty,
      s.maxQty
    );
    const estimatedValueGbp = clampInt(
      s.minValue + rng() * (s.maxValue - s.minValue),
      s.minValue,
      s.maxValue
    );
    const weightKg =
      typeof s.minWeightKg === 'number' && typeof s.maxWeightKg === 'number'
        ? Math.round((s.minWeightKg + rng() * (s.maxWeightKg - s.minWeightKg)) * 10) / 10
        : undefined;

    items.push({
      id: globalThis.crypto?.randomUUID?.() ?? `item_${items.length}_${idx}`,
      itemDescription: s.itemDescription,
      category: s.category,
      quantity,
      valueGbp: estimatedValueGbp,
      countryOfOrigin: s.countryOfOrigin,
      weightKg,
      serialNumber: s.serialNumber,
      notes: s.notes,
    });
  }

  // Add 1-2 “Other” items for realism.
  const extra = clampInt(rng() * 2, 0, 2);
  for (let i = 0; i < extra; i++) {
    const cat = pick(rng, CATEGORIES);
    items.push({
      id: globalThis.crypto?.randomUUID?.() ?? `extra_${i}`,
      itemDescription:
        cat === 'Kitchen Equipment'
          ? 'Flight Case (kitchen equipment)'
          : cat === 'Audio Equipment'
            ? 'XLR Cable Bundle (assorted lengths)'
            : 'Flight Case (foam inserts)',
      category: cat,
      quantity: clampInt(1 + rng() * 4, 1, 5),
      valueGbp: clampInt(50 + rng() * 400, 50, 450),
      countryOfOrigin: pick(rng, ['UK', 'China', 'Germany', 'USA', 'Japan']),
      weightKg: Math.round((8 + rng() * 18) * 10) / 10,
      serialNumber: 'N/A',
      notes: 'Case ID: N/A',
    });
  }

  return items;
}


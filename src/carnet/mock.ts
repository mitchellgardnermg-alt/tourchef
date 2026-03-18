import type { CarnetCategory, CarnetItem, UploadedImage } from './types';

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

const SAMPLE_ITEMS: Array<{
  itemName: string;
  category: CarnetCategory;
  minQty: number;
  maxQty: number;
  minValue: number;
  maxValue: number;
  notes: string;
}> = [
  {
    itemName: 'Stainless Steel Pan',
    category: 'Kitchen',
    minQty: 2,
    maxQty: 8,
    minValue: 18,
    maxValue: 55,
    notes: 'Assorted sizes',
  },
  {
    itemName: 'Gas Burner',
    category: 'Kitchen',
    minQty: 1,
    maxQty: 3,
    minValue: 45,
    maxValue: 140,
    notes: 'Portable single ring',
  },
  {
    itemName: 'Chef Knife Set',
    category: 'Kitchen',
    minQty: 1,
    maxQty: 2,
    minValue: 120,
    maxValue: 380,
    notes: 'Includes sharpening steel',
  },
  {
    itemName: 'Food Processor',
    category: 'Kitchen',
    minQty: 1,
    maxQty: 2,
    minValue: 95,
    maxValue: 320,
    notes: 'Bowl + blade attachments',
  },
  {
    itemName: 'Extension Cable (25m)',
    category: 'Production',
    minQty: 4,
    maxQty: 16,
    minValue: 12,
    maxValue: 35,
    notes: 'UK plug',
  },
  {
    itemName: 'Label Printer',
    category: 'IT',
    minQty: 1,
    maxQty: 2,
    minValue: 65,
    maxValue: 210,
    notes: 'With spare rolls',
  },
  {
    itemName: 'Wireless Microphone (Handheld)',
    category: 'Audio',
    minQty: 2,
    maxQty: 6,
    minValue: 180,
    maxValue: 640,
    notes: 'Receivers in rack case',
  },
  {
    itemName: 'DI Box',
    category: 'Audio',
    minQty: 4,
    maxQty: 12,
    minValue: 25,
    maxValue: 140,
    notes: 'Active mix',
  },
  {
    itemName: 'LED Par Can',
    category: 'Lighting',
    minQty: 6,
    maxQty: 24,
    minValue: 45,
    maxValue: 220,
    notes: 'DMX capable',
  },
  {
    itemName: 'Tripod Stand',
    category: 'Production',
    minQty: 2,
    maxQty: 8,
    minValue: 18,
    maxValue: 85,
    notes: 'Lightweight aluminium',
  },
  {
    itemName: 'Electric Guitar',
    category: 'Instruments',
    minQty: 1,
    maxQty: 3,
    minValue: 350,
    maxValue: 2400,
    notes: 'In hard case',
  },
  {
    itemName: 'Guitar Pedalboard',
    category: 'Backline',
    minQty: 1,
    maxQty: 2,
    minValue: 260,
    maxValue: 1400,
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

    items.push({
      id: globalThis.crypto?.randomUUID?.() ?? `item_${items.length}_${idx}`,
      itemName: s.itemName,
      category: s.category,
      quantity,
      estimatedValueGbp,
      notes: s.notes,
    });
  }

  // Add 1-2 “Other” items for realism.
  const extra = clampInt(rng() * 2, 0, 2);
  for (let i = 0; i < extra; i++) {
    const cat = pick(rng, CATEGORIES);
    items.push({
      id: globalThis.crypto?.randomUUID?.() ?? `extra_${i}`,
      itemName:
        cat === 'Kitchen'
          ? 'Flight Case (Kitchen)'
          : cat === 'Audio'
          ? 'XLR Cable Bundle'
          : 'Flight Case',
      category: cat,
      quantity: clampInt(1 + rng() * 4, 1, 5),
      estimatedValueGbp: clampInt(50 + rng() * 400, 50, 450),
      notes: 'Packed with foam inserts',
    });
  }

  return items;
}


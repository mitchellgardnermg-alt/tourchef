import React from 'react';
import { Download, FileSpreadsheet, Plus, ArrowLeft, ImagePlus, Wand2, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { exportCarnetAsExcel, exportCarnetAsPdf } from '../carnet/export';
import { filesToUploadedImages, useCarnet } from '../carnet/store';
import type { CarnetCategory, CarnetItem, UploadedImage } from '../carnet/types';
import { normalizeAiItems } from '../carnet/ai';

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

function parseNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mergeItems(existing: CarnetItem[], incoming: CarnetItem[]): CarnetItem[] {
  const normalizeText = (s: string) => s.trim().toLowerCase();
  const normalizeSerial = (s?: string) => normalizeText(s ?? '');
  const hasRealSerial = (s?: string) => {
    const serial = normalizeSerial(s);
    return serial !== '' && serial !== 'n/a' && serial !== 'no serial';
  };
  const sameDescriptionCategory = (a: CarnetItem, b: CarnetItem) =>
    normalizeText(a.itemDescription) === normalizeText(b.itemDescription) &&
    a.category === b.category;

  const next: CarnetItem[] = existing.map((it) => {
    return { ...it };
  });

  for (const inc of incoming) {
    // Only merge when we have strong evidence it's the same item.
    // If serial is missing ("N/A"), append as a new row so new uploads visibly add.
    const incomingSerial = normalizeSerial(inc.serialNumber);
    const incomingHasRealSerial = hasRealSerial(inc.serialNumber);

    const found = next.find((ex) => {
      if (!sameDescriptionCategory(ex, inc)) return false;
      if (!incomingHasRealSerial) return false;
      return normalizeSerial(ex.serialNumber) === incomingSerial;
    });

    if (!found) {
      const copy = { ...inc };
      next.push(copy);
      continue;
    }

    // Keep user edits and only enrich missing fields.
    found.quantity = Math.max(0, (found.quantity || 0) + (inc.quantity || 0));
    if (!found.valueGbp && inc.valueGbp) found.valueGbp = inc.valueGbp;
    if (!found.countryOfOrigin && inc.countryOfOrigin) found.countryOfOrigin = inc.countryOfOrigin;
    if (found.weightKg === undefined && inc.weightKg !== undefined) found.weightKg = inc.weightKg;
    if (
      (!found.serialNumber || found.serialNumber === 'N/A') &&
      inc.serialNumber &&
      inc.serialNumber !== 'N/A'
    ) {
      found.serialNumber = inc.serialNumber;
    }
    if (!found.notes && inc.notes) found.notes = inc.notes;
  }

  return next;
}

export function ResultsPage() {
  const navigate = useNavigate();
  const { images, items, setItems, updateItem, addItem, removeItem, addImages } = useCarnet();
  const [aiConfigured, setAiConfigured] = React.useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractError, setExtractError] = React.useState<string | null>(null);
  const [pendingImages, setPendingImages] = React.useState<UploadedImage[]>([]);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (items.length === 0) navigate('/dashboard');
  }, [items.length, navigate]);

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setAiConfigured(Boolean(j?.ai?.configured));
      })
      .catch(() => {
        if (!mounted) return;
        setAiConfigured(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const pendingRef = React.useRef<UploadedImage[]>([]);
  pendingRef.current = pendingImages;
  React.useEffect(() => () => {
    pendingRef.current.forEach((img) => URL.revokeObjectURL(img.objectUrl));
  }, []);

  const totalValue = React.useMemo(
    () => items.reduce((acc, it) => acc + (it.valueGbp || 0) * (it.quantity || 0), 0),
    [items]
  );

  const onAddItem = () =>
    addItem({
      itemDescription: 'New item (be specific)',
      category: 'Other',
      serialNumber: 'N/A',
      countryOfOrigin: '',
    });

  const onExportPdf = () => exportCarnetAsPdf(items);
  const onExportExcel = () => exportCarnetAsExcel(items);

  const onPickMoreImages = () => uploadInputRef.current?.click();

  const onMoreImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPendingImages((prev) => [...prev, ...filesToUploadedImages(files)]);
    setExtractError(null);
    e.target.value = '';
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const extractFromPending = async () => {
    if (pendingImages.length === 0) return;
    setExtractError(null);
    setIsExtracting(true);
    try {
      const fd = new FormData();
      for (const img of pendingImages) fd.append('images', img.file, img.file.name);

      const resp = await fetch('/api/extract-carnet-items', { method: 'POST', body: fd });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const msg =
          typeof errJson?.error === 'string'
            ? errJson.error
            : `Request failed (${resp.status}).`;
        setExtractError(msg);
        return;
      }

      const json = await resp.json();
      const { items: aiItems, warnings } = normalizeAiItems(json);
      if (warnings.length) console.warn('AI warnings:', warnings);
      if (!aiItems.length) {
        setExtractError('AI did not return any items from these photos. Try clearer images.');
        return;
      }

      setItems((prev) => mergeItems(prev, aiItems));
      addImages(pendingImages);
      setPendingImages([]);
    } catch (err: any) {
      setExtractError(err?.message || 'Request failed. Check your connection and server.');
    } finally {
      setIsExtracting(false);
    }
  };

  const onSort = (key: keyof CarnetItem) => {
    const next = [...items].sort((a, b) => {
      const av = a[key] as any;
      const bv = b[key] as any;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    setItems(next);
  };

  return (
    <div className="min-h-screen bg-app text-app">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="btn btn-ghost">
                <ArrowLeft size={16} />
                Back
              </Link>
              <div className="font-semibold tracking-tight">Results</div>
            </div>
            <div className="mt-2 text-xs text-white/60">
              {images.length} photo{images.length === 1 ? '' : 's'} processed •{' '}
              {items.length} item{items.length === 1 ? '' : 's'} generated
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={onPickMoreImages} title="Add more photos to extract from">
              <ImagePlus size={16} /> Upload more images
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onMoreImagesSelected}
            />
            <button className="btn btn-secondary" onClick={onAddItem}>
              <Plus size={16} /> Add Item
            </button>
            <button className="btn btn-secondary" onClick={onExportExcel}>
              <FileSpreadsheet size={16} /> Export as Excel
            </button>
            <button className="btn btn-primary" onClick={onExportPdf}>
              <Download size={16} /> Export as PDF
            </button>
          </div>
        </header>

        <main className="mt-8">
          {extractError ? (
            <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {extractError}
            </div>
          ) : null}

          {isExtracting ? (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <span className="inline-flex items-center gap-2">
                <Wand2 size={16} />
                Extracting items from your new photos…
              </span>
            </div>
          ) : null}

          {pendingImages.length > 0 ? (
            <section className="card p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">New photos to extract</h3>
                  <p className="mt-1 text-xs text-white/60">
                    {pendingImages.length} photo{pendingImages.length === 1 ? '' : 's'} ready. Click &quot;Extract & add to list&quot; to add items.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={extractFromPending}
                    disabled={isExtracting || aiConfigured === false}
                    title={aiConfigured === false ? 'Set OPENAI_API_KEY on the server' : ''}
                  >
                    <Wand2 size={16} /> Extract & add to list
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {pendingImages.map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img src={img.objectUrl} alt={img.file.name} className="h-32 w-full object-cover" />
                    <div className="p-3">
                      <div className="truncate text-xs text-white/70">{img.file.name}</div>
                    </div>
                    <button
                      onClick={() => removePendingImage(img.id)}
                      className="absolute right-2 top-2 rounded-lg bg-black/40 border border-white/10 p-2 opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
              <div className="text-sm font-semibold">Carnet list</div>
              <div className="text-xs text-white/60">
                Estimated total value:{' '}
                <span className="font-semibold text-white">
                  £{totalValue.toLocaleString('en-GB')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="text-xs uppercase tracking-wider text-white/55">
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 text-left">
                      <button className="hover:text-white" onClick={() => onSort('itemDescription')}>
                        Item Description
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <button className="hover:text-white" onClick={() => onSort('category')}>
                        Category
                      </button>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <button className="hover:text-white" onClick={() => onSort('quantity')}>
                        Quantity
                      </button>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <button
                        className="hover:text-white"
                        onClick={() => onSort('valueGbp')}
                      >
                        Value (GBP)
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <button className="hover:text-white" onClick={() => onSort('countryOfOrigin')}>
                        Country of Origin
                      </button>
                    </th>
                    <th className="px-5 py-3 text-right">
                      <button className="hover:text-white" onClick={() => onSort('weightKg')}>
                        Weight (kg)
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <button className="hover:text-white" onClick={() => onSort('serialNumber')}>
                        Serial / Identifier
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left">Notes</th>
                    <th className="px-5 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-3">
                        <input
                          value={it.itemDescription}
                          onChange={(e) => updateItem(it.id, { itemDescription: e.target.value })}
                          className="input w-full"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={it.category}
                          onChange={(e) =>
                            updateItem(it.id, { category: e.target.value as CarnetCategory })
                          }
                          className="input w-full"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <input
                          inputMode="numeric"
                          value={String(it.quantity)}
                          onChange={(e) =>
                            updateItem(it.id, {
                              quantity: Math.max(0, parseNumber(e.target.value, it.quantity)),
                            })
                          }
                          className="input w-24 text-right"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <input
                          inputMode="numeric"
                          value={String(it.valueGbp)}
                          onChange={(e) =>
                            updateItem(it.id, {
                              valueGbp: Math.max(
                                0,
                                parseNumber(e.target.value, it.valueGbp)
                              ),
                            })
                          }
                          className="input w-36 text-right"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          value={it.countryOfOrigin}
                          onChange={(e) => updateItem(it.id, { countryOfOrigin: e.target.value })}
                          className="input w-full"
                          placeholder="e.g. UK, China, Germany"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <input
                          inputMode="decimal"
                          value={it.weightKg === undefined ? '' : String(it.weightKg)}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            updateItem(it.id, {
                              weightKg: v === '' ? undefined : Math.max(0, parseNumber(v, it.weightKg ?? 0)),
                            });
                          }}
                          className="input w-28 text-right"
                          placeholder="optional"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          value={it.serialNumber}
                          onChange={(e) => updateItem(it.id, { serialNumber: e.target.value })}
                          className="input w-full"
                          placeholder='e.g. "No serial" or actual serial'
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          value={it.notes}
                          onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                          className="input w-full"
                          placeholder="e.g. brand/model, case ID, condition"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          className="btn btn-ghost"
                          onClick={() => removeItem(it.id)}
                          title="Remove item"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-6 text-xs text-white/50">
            Tip: for live carnet filings, add serial numbers and case identifiers
            in Notes.
          </div>
        </main>
      </div>
    </div>
  );
}


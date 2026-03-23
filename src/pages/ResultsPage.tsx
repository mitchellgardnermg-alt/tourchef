import React from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  ImagePlus,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { exportCarnetAsExcel, exportCarnetAsPdf } from '../carnet/export';
import { filesToUploadedImages, useCarnet } from '../carnet/store';
import type { CarnetCategory, CarnetItem, UploadedImage } from '../carnet/types';
import { normalizeAiItems } from '../carnet/ai';
import { validateCarnetItems } from '../carnet/validation';

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
    if (found.aiConfidence === undefined && inc.aiConfidence !== undefined) {
      found.aiConfidence = inc.aiConfidence;
    }
    if (!found.aiEvidence && inc.aiEvidence) found.aiEvidence = inc.aiEvidence;
    if (found.aiValueEstimated === undefined && inc.aiValueEstimated !== undefined) {
      found.aiValueEstimated = inc.aiValueEstimated;
    }
    if (!found.aiValueEstimateReason && inc.aiValueEstimateReason) {
      found.aiValueEstimateReason = inc.aiValueEstimateReason;
    }
  }

  return next;
}

function getConfidenceScore(item: CarnetItem, blockers: string[], warnings: string[]) {
  if (item.aiValueEstimated) {
    const estimatedScore =
      typeof item.aiConfidence === 'number' && Number.isFinite(item.aiConfidence)
        ? Math.min(item.aiConfidence, 60)
        : 55;
    return Math.max(0, Math.min(100, Math.round(estimatedScore)));
  }
  if (typeof item.aiConfidence === 'number' && Number.isFinite(item.aiConfidence)) {
    return Math.max(0, Math.min(100, Math.round(item.aiConfidence)));
  }
  let score = 100;
  score -= blockers.length * 25;
  score -= warnings.length * 8;
  if (!item.notes?.trim()) score -= 8;
  if (!item.countryOfOrigin?.trim()) score -= 10;
  if (!item.serialNumber?.trim() || item.serialNumber.trim().toLowerCase() === 'n/a') score -= 8;
  return Math.max(0, Math.min(100, score));
}

function confidenceLabel(score: number) {
  if (score >= 85) return 'High';
  if (score >= 65) return 'Medium';
  return 'Low';
}

function evidenceText(item: CarnetItem) {
  const estReason = item.aiValueEstimateReason?.trim();
  if (item.aiValueEstimated && estReason) {
    return estReason.length > 52 ? `${estReason.slice(0, 52)}...` : estReason;
  }
  const aiEvidence = item.aiEvidence?.trim();
  if (aiEvidence) return aiEvidence.length > 52 ? `${aiEvidence.slice(0, 52)}...` : aiEvidence;
  const notes = item.notes?.trim();
  if (!notes) return 'No explicit evidence in notes';
  return notes.length > 52 ? `${notes.slice(0, 52)}...` : notes;
}

export function ResultsPage() {
  const navigate = useNavigate();
  const {
    projectName,
    setProjectName,
    images,
    items,
    extractionRuns,
    auditEvents,
    setItems,
    updateItem,
    addItem,
    removeItem,
    addImages,
    addExtractionRun,
    addAuditEvent,
  } = useCarnet();
  const [aiConfigured, setAiConfigured] = React.useState<boolean | null>(null);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractError, setExtractError] = React.useState<string | null>(null);
  const [extractInfo, setExtractInfo] = React.useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = React.useState<CarnetCategory>('Other');
  const [bulkCountry, setBulkCountry] = React.useState('');
  const [showOnlyBlockers, setShowOnlyBlockers] = React.useState(false);
  const [showOnlyLowConfidence, setShowOnlyLowConfidence] = React.useState(false);
  const [reviewMode, setReviewMode] = React.useState(false);
  const [reviewIndex, setReviewIndex] = React.useState(0);
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
  React.useEffect(
    () => () => {
      pendingRef.current.forEach((img) => URL.revokeObjectURL(img.objectUrl));
    },
    []
  );

  const totalValue = React.useMemo(
    () => items.reduce((acc, it) => acc + (it.valueGbp || 0) * (it.quantity || 0), 0),
    [items]
  );
  const validation = React.useMemo(() => validateCarnetItems(items), [items]);
  const reviewItems = React.useMemo(
    () =>
      items.filter(
        (it) =>
          (validation.byId[it.id]?.blockers.length ?? 0) > 0 ||
          (validation.byId[it.id]?.warnings.length ?? 0) > 0
      ),
    [items, validation]
  );
  React.useEffect(() => {
    if (reviewItems.length === 0) {
      setReviewIndex(0);
      return;
    }
    if (reviewIndex > reviewItems.length - 1) {
      setReviewIndex(reviewItems.length - 1);
    }
  }, [reviewItems, reviewIndex]);
  const activeReviewId = reviewItems[reviewIndex]?.id;
  const visibleItems = React.useMemo(
    () =>
      reviewMode
        ? reviewItems
        : showOnlyLowConfidence
        ? items.filter((it) => getConfidenceScore(it, validation.byId[it.id]?.blockers ?? [], validation.byId[it.id]?.warnings ?? []) < 65)
        : showOnlyBlockers
        ? items.filter((it) => validation.byId[it.id]?.blockers.length)
        : items,
    [items, showOnlyBlockers, showOnlyLowConfidence, reviewMode, reviewItems, validation]
  );

  const onAddItem = () =>
    addItem({
      itemDescription: 'New item (be specific)',
      category: 'Other',
      serialNumber: 'N/A',
      countryOfOrigin: '',
    });

  const onExportPdf = () => {
    if (!validation.readyToExport) {
      setExtractError('Fix compliance blockers before exporting.');
      return;
    }
    exportCarnetAsPdf(items);
    addAuditEvent({
      type: 'export_pdf',
      message: `Exported PDF with ${items.length} item${items.length === 1 ? '' : 's'}.`,
    });
  };
  const onExportExcel = () => {
    if (!validation.readyToExport) {
      setExtractError('Fix compliance blockers before exporting.');
      return;
    }
    exportCarnetAsExcel(items);
    addAuditEvent({
      type: 'export_excel',
      message: `Exported Excel with ${items.length} item${items.length === 1 ? '' : 's'}.`,
    });
  };

  const onPickAnalysisPhotos = () => uploadInputRef.current?.click();

  const onAnalysisPhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    setExtractError(null);
    setExtractInfo(null);
    setPendingImages((prev) => [...prev, ...filesToUploadedImages(files)]);
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const analyzePendingImages = async () => {
    if (pendingImages.length === 0) return;
    setExtractError(null);
    setExtractInfo(null);
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

      let addedRows = 0;
      let updatedRows = 0;
      setItems((prev) => {
        const merged = mergeItems(prev, aiItems);
        addedRows = Math.max(0, merged.length - prev.length);
        updatedRows = Math.max(0, aiItems.length - addedRows);
        return merged;
      });
      addImages(pendingImages);
      setPendingImages([]);
      // Ensure new/updated rows are visible immediately after analysis.
      setShowOnlyBlockers(false);
      setShowOnlyLowConfidence(false);
      setReviewMode(false);
      addExtractionRun({
        source: 'results_upload_more',
        imageCount: pendingImages.length,
        extractedItemCount: aiItems.length,
      });
      addAuditEvent({
        type: 'items_appended',
        message: `Analyzed ${pendingImages.length} additional image${
          pendingImages.length === 1 ? '' : 's'
        }: added ${addedRows} new item${addedRows === 1 ? '' : 's'}, updated ${updatedRows} existing.`,
      });
      setExtractInfo(
        `AI extraction complete: added ${addedRows} new row${
          addedRows === 1 ? '' : 's'
        } and updated ${updatedRows} existing from ${pendingImages.length} photo${
          pendingImages.length === 1 ? '' : 's'
        }.`
      );
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

  const applyBulkCategory = () => {
    setItems((prev) => prev.map((it) => ({ ...it, category: bulkCategory })));
    addAuditEvent({
      type: 'items_appended',
      message: `Bulk-updated category to "${bulkCategory}" for ${items.length} item${
        items.length === 1 ? '' : 's'
      }.`,
    });
  };

  const applyBulkCountry = () => {
    const country = bulkCountry.trim();
    if (!country) return;
    setItems((prev) =>
      prev.map((it) => ({ ...it, countryOfOrigin: it.countryOfOrigin || country }))
    );
    addAuditEvent({
      type: 'items_appended',
      message: `Bulk-filled missing country of origin with "${country}".`,
    });
  };

  const autoFixBlockers = () => {
    const fallbackCountry = bulkCountry.trim() || 'Unknown';
    let fixedCount = 0;
    setItems((prev) =>
      prev.map((it) => {
        const row = validation.byId[it.id];
        if (!row?.blockers.length) return it;
        fixedCount += 1;
        const itemDescription = it.itemDescription.trim() || 'Unspecified equipment item';
        const quantity =
          Number.isFinite(it.quantity) && it.quantity >= 1 ? Math.round(it.quantity) : 1;
        const valueGbp =
          Number.isFinite(it.valueGbp) && it.valueGbp >= 0 ? Math.round(it.valueGbp) : 0;
        const countryOfOrigin = it.countryOfOrigin.trim() || fallbackCountry;
        const serialNumber = it.serialNumber.trim() || 'N/A';
        return {
          ...it,
          itemDescription,
          quantity,
          valueGbp,
          countryOfOrigin,
          serialNumber,
        };
      })
    );
    setExtractInfo(
      `Auto-fixed blockers for ${fixedCount} item${fixedCount === 1 ? '' : 's'}.`
    );
    addAuditEvent({
      type: 'items_appended',
      message: `Auto-fixed compliance blockers for ${fixedCount} item${
        fixedCount === 1 ? '' : 's'
      }.`,
    });
  };

  return (
    <div className="min-h-screen bg-app text-app">
      {isExtracting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-zinc-950/95 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5">
              <Wand2 size={20} className="animate-spin text-white/90" />
            </div>
            <h3 className="text-base font-semibold">Generating carnet items...</h3>
            <p className="mt-2 text-sm text-white/65">
              AI is analyzing your photos and adding results to the current list.
            </p>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      ) : null}

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
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="input mt-2 w-full max-w-md text-sm"
              placeholder="Project name"
            />
            <div className="mt-2 text-xs text-white/60">
              {images.length} photo{images.length === 1 ? '' : 's'} processed •{' '}
              {items.length} item{items.length === 1 ? '' : 's'} generated
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={onPickAnalysisPhotos} title="Pick photos to analyze and add as items">
              <ImagePlus size={16} /> Add from photos
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onAnalysisPhotosSelected}
            />
            <button className="btn btn-secondary" onClick={onAddItem}>
              <Plus size={16} /> Add Item
            </button>
            <button
              className="btn btn-secondary"
              onClick={onExportExcel}
              disabled={!validation.readyToExport}
              title={!validation.readyToExport ? 'Fix compliance blockers first' : ''}
            >
              <FileSpreadsheet size={16} /> Export as Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={onExportPdf}
              disabled={!validation.readyToExport}
              title={!validation.readyToExport ? 'Fix compliance blockers first' : ''}
            >
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
          {extractInfo ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <div className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{extractInfo}</span>
              </div>
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
            <section className="card mb-6 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Add items from photos</div>
                  <div className="mt-1 text-xs text-white/60">
                    {pendingImages.length} photo{pendingImages.length === 1 ? '' : 's'} selected. Click analyze to add items to this list.
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={analyzePendingImages}
                  disabled={isExtracting || aiConfigured === false}
                  title={aiConfigured === false ? 'Set OPENAI_API_KEY on the server' : ''}
                >
                  <Wand2 size={16} /> Analyze photos
                </button>
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
                      aria-label="Remove image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card mb-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Compliance Check</div>
                <div className="mt-1 text-xs text-white/60">
                  {validation.readyToExport
                    ? 'Ready to export'
                    : `${validation.blockerCount} blocker${
                        validation.blockerCount === 1 ? '' : 's'
                      } to fix`}{' '}
                  • {validation.warningCount} warning
                  {validation.warningCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                {validation.readyToExport ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-300" />
                    <span className="text-emerald-200">Export Ready</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-amber-300" />
                    <span className="text-amber-200">Action Needed</span>
                  </>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <div className="mb-1 text-xs text-white/60">Bulk category</div>
                <select
                  className="input w-52"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as CarnetCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-secondary" onClick={applyBulkCategory}>
                Apply to all items
              </button>
              <div>
                <div className="mb-1 text-xs text-white/60">Bulk country of origin</div>
                <input
                  className="input w-40"
                  placeholder="e.g. UK"
                  value={bulkCountry}
                  onChange={(e) => setBulkCountry(e.target.value)}
                />
              </div>
              <button className="btn btn-secondary" onClick={applyBulkCountry}>
                Fill missing countries
              </button>
              <button
                className="btn btn-secondary"
                onClick={autoFixBlockers}
                disabled={validation.blockerCount === 0}
              >
                Auto-fix blockers
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowOnlyBlockers((v) => !v)}
              >
                {showOnlyBlockers ? 'Show all rows' : 'Show blockers only'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setShowOnlyLowConfidence((v) => !v)}
              >
                {showOnlyLowConfidence ? 'Show all confidence' : 'Show low confidence only'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setReviewMode((v) => !v)}
              >
                {reviewMode ? 'Exit review queue' : 'Review queue'}
              </button>
            </div>
            {reviewMode ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span>
                  Reviewing {reviewItems.length === 0 ? 0 : reviewIndex + 1} of {reviewItems.length}{' '}
                  unresolved items
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={reviewItems.length === 0}
                  onClick={() =>
                    setReviewIndex((i) =>
                      reviewItems.length === 0 ? 0 : (i - 1 + reviewItems.length) % reviewItems.length
                    )
                  }
                >
                  Previous
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={reviewItems.length === 0}
                  onClick={() =>
                    setReviewIndex((i) =>
                      reviewItems.length === 0 ? 0 : (i + 1) % reviewItems.length
                    )
                  }
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>

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
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Confidence</th>
                    <th className="px-5 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {visibleItems.map((it) => (
                    (() => {
                      const blockers = validation.byId[it.id]?.blockers ?? [];
                      const warnings = validation.byId[it.id]?.warnings ?? [];
                      const score = getConfidenceScore(it, blockers, warnings);
                      const label = confidenceLabel(score);
                      const isActive = reviewMode && activeReviewId === it.id;
                      return (
                    <tr
                      key={it.id}
                      className={
                        isActive
                          ? 'bg-cyan-500/[0.12] hover:bg-cyan-500/[0.14]'
                          : blockers.length
                          ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                          : 'hover:bg-white/[0.03]'
                      }
                    >
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
                      <td className="px-5 py-3 align-top text-xs">
                        {blockers.length ? (
                          <div className="text-amber-200">
                            {blockers[0]}
                          </div>
                        ) : warnings.length ? (
                          <div className="text-yellow-200">
                            {warnings[0]}
                          </div>
                        ) : (
                          <div className="text-emerald-200">Ready</div>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-xs">
                        <div
                          className={
                            label === 'High'
                              ? 'text-emerald-200'
                              : label === 'Medium'
                              ? 'text-yellow-200'
                              : 'text-amber-200'
                          }
                        >
                          {label} ({score}%)
                        </div>
                        {it.aiValueEstimated ? (
                          <div className="mt-1 text-amber-200">Estimated value</div>
                        ) : null}
                        <div className="mt-1 text-white/50">{evidenceText(it)}</div>
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
                      );
                    })()
                  ))}
                </tbody>
              </table>
              {visibleItems.length === 0 ? (
                <div className="px-5 py-6 text-sm text-white/60">
                  No blocker rows to review.
                </div>
              ) : null}
            </div>
          </section>

          <div className="mt-6 text-xs text-white/50">
            Tip: for live carnet filings, add serial numbers and case identifiers
            in Notes.
          </div>

          <section className="card mt-6 p-5">
            <div className="text-sm font-semibold">Activity</div>
            <div className="mt-3 text-xs text-white/55">
              {extractionRuns.length} extraction run
              {extractionRuns.length === 1 ? '' : 's'} • {auditEvents.length}{' '}
              event{auditEvents.length === 1 ? '' : 's'}
            </div>
            <div className="mt-3 space-y-2">
              {auditEvents.slice(0, 8).map((evt) => (
                <div key={evt.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-sm text-white/80">{evt.message}</div>
                  <div className="mt-1 text-[11px] text-white/45">
                    {new Date(evt.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {auditEvents.length === 0 ? (
                <div className="text-sm text-white/55">No activity yet.</div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


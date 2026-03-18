import React from 'react';
import { Download, FileSpreadsheet, Plus, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { exportCarnetAsExcel, exportCarnetAsPdf } from '../carnet/export';
import { useCarnet } from '../carnet/store';
import type { CarnetCategory, CarnetItem } from '../carnet/types';

const CATEGORIES: CarnetCategory[] = [
  'Kitchen Equipment',
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

export function ResultsPage() {
  const navigate = useNavigate();
  const { images, items, setItems, updateItem, addItem, removeItem } = useCarnet();

  React.useEffect(() => {
    if (items.length === 0) navigate('/dashboard');
  }, [items.length, navigate]);

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


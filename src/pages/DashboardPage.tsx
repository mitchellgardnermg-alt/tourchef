import React from 'react';
import { ImagePlus, Trash2, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { filesToUploadedImages, useCarnet } from '../carnet/store';
import { normalizeAiItems } from '../carnet/ai';

export function DashboardPage() {
  const navigate = useNavigate();
  const { images, addImages, removeImage, clearItems, setItems } = useCarnet();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/health');
        const json = await res.json().catch(() => ({}));
        const configured = Boolean(json?.ai?.configured);
        if (!cancelled) setAiConfigured(configured);
      } catch {
        if (!cancelled) setAiConfigured(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPickFiles = () => inputRef.current?.click();

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addImages(filesToUploadedImages(files));
    e.target.value = '';
  };

  const generate = async () => {
    setIsGenerating(true);
    setLastError(null);
    clearItems();

    try {
      const fd = new FormData();
      for (const img of images) fd.append('images', img.file, img.file.name);

      const resp = await fetch('/api/extract-carnet-items', {
        method: 'POST',
        body: fd,
      });

      if (resp.ok) {
        const json = await resp.json();
        const { items: aiItems, warnings } = normalizeAiItems(json);
        if (warnings.length) console.warn('AI warnings:', warnings);
        if (aiItems.length) {
          setItems(aiItems);
          navigate('/results');
          return;
        }
        setLastError(
          'AI did not return any items from your photos. Try clearer or different images.'
        );
        return;
      }

      const errJson = await resp.json().catch(() => ({}));
      const msg =
        typeof errJson?.error === 'string'
          ? errJson.error
          : `Request failed (${resp.status}). Check OPENAI_API_KEY is set on the server.`;
      setLastError(msg);
    } catch (e: any) {
      setLastError(e?.message || 'Request failed. Check your connection and server.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-app">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between">
          <div className="font-semibold tracking-tight">CarnetAI</div>
          <div className="text-xs text-white/60">
            Upload photos → generate → export
          </div>
        </header>

        <main className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="card p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold">Dashboard</h2>
                <p className="mt-1 text-sm text-white/60">
                  Upload multiple images of your equipment.{' '}
                  {aiConfigured === true
                    ? 'AI will extract a carnet-ready list from your photos only.'
                    : 'Set OPENAI_API_KEY on the server to generate lists from your photos.'}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={onPickFiles}>
                <ImagePlus size={16} /> Upload images
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFilesSelected}
              />
            </div>

            <div className="mt-6">
              {images.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <ImagePlus size={18} className="text-white/80" />
                  </div>
                  <div className="mt-4 text-sm font-medium">
                    Drop images here (or click upload)
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    Kitchen gear, production kits, instruments — anything that
                    needs to cross borders.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((img) => (
                    <div key={img.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      <img
                        src={img.objectUrl}
                        alt={img.file.name}
                        className="h-32 w-full object-cover"
                      />
                      <div className="p-3">
                        <div className="truncate text-xs text-white/70">
                          {img.file.name}
                        </div>
                      </div>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute right-2 top-2 rounded-lg bg-black/40 border border-white/10 p-2 opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="card p-6 h-fit">
            <h3 className="text-sm font-semibold">Next step</h3>
            <p className="mt-2 text-sm text-white/60">
              When you’re ready, generate a draft list. You can edit everything
              before exporting.
            </p>

            <button
              className="btn btn-primary mt-5 w-full"
              onClick={generate}
              disabled={images.length === 0 || isGenerating || aiConfigured === false}
              title={
                images.length === 0
                  ? 'Upload at least 1 image first'
                  : aiConfigured === false
                    ? 'Set OPENAI_API_KEY on the server to generate lists'
                    : ''
              }
            >
              <Wand2 size={16} />
              {isGenerating ? 'Generating…' : 'Generate Carnet List'}
            </button>

            {lastError ? (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {lastError}
              </div>
            ) : null}
            {aiConfigured === false ? (
              <p className="mt-3 text-xs text-white/50">
                Generate is disabled until OPENAI_API_KEY is set on the server.
              </p>
            ) : null}

            <div className="mt-4 text-xs text-white/50">
              Tip: upload clear photos of each item for better extraction.
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}


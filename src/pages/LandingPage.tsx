import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
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

  return (
    <div className="min-h-screen bg-app text-app">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Sparkles size={18} className="text-white/90" />
            </div>
            <div className="font-semibold tracking-tight">CarnetAI</div>
          </div>
          <Link to="/dashboard" className="btn btn-secondary">
            Get Started <ArrowRight size={16} />
          </Link>
        </header>

        <main className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {aiConfigured === true
                ? 'AI extraction enabled'
                : aiConfigured === false
                  ? 'MVP prototype — simulated AI extraction'
                  : 'MVP prototype'}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Create Carnet Lists from Photos in Minutes
            </h1>
            <p className="mt-4 text-white/70 text-lg leading-relaxed">
              Upload images of your equipment and generate export-ready carnet
              documents instantly.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard" className="btn btn-primary">
                Get Started <ArrowRight size={16} />
              </Link>
              <a
                href="#how"
                className="btn btn-ghost"
              >
                How it works
              </a>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <div className="text-sm font-medium">Upload</div>
                <div className="text-xs text-white/60 mt-1">
                  Add multiple photos from your phone.
                </div>
              </div>
              <div className="card p-4">
                <div className="text-sm font-medium">Generate</div>
                <div className="text-xs text-white/60 mt-1">
                  {aiConfigured === true
                    ? 'AI extracts items into a structured carnet list.'
                    : 'We simulate AI extraction into structured items.'}
                </div>
              </div>
              <div className="card p-4">
                <div className="text-sm font-medium">Export</div>
                <div className="text-xs text-white/60 mt-1">
                  PDF for customs, Excel for ops.
                </div>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-10 bg-gradient-to-tr from-emerald-500/20 via-cyan-500/10 to-purple-500/10 blur-3xl" />
            <div className="relative card p-6">
              <div className="text-sm font-medium">Preview</div>
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                <div className="bg-white/5 px-4 py-3 text-xs text-white/60 flex justify-between">
                  <span>Generated Carnet List</span>
                  <span>Editable</span>
                </div>
                <div className="divide-y divide-white/10">
                  {[
                    ['Stainless Steel Pan', 'Kitchen', '6', '£240', 'Assorted sizes'],
                    ['Gas Burner', 'Kitchen', '2', '£180', 'Portable single ring'],
                    ['Wireless Microphone', 'Audio', '4', '£1,200', 'Receivers in rack case'],
                    ['LED Par Can', 'Lighting', '12', '£1,560', 'DMX capable'],
                  ].map((row) => (
                    <div
                      key={row[0]}
                      className="grid grid-cols-5 gap-3 px-4 py-3 text-xs text-white/75"
                    >
                      <div className="col-span-2 font-medium">{row[0]}</div>
                      <div>{row[1]}</div>
                      <div>{row[2]}</div>
                      <div className="text-right">{row[3]}</div>
                      <div className="col-span-5 text-white/50 mt-1">
                        {row[4]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div id="how" className="mt-6 text-xs text-white/60">
                {aiConfigured === true
                  ? 'CarnetAI uses Vision to draft a list from your photos. You can edit everything before export.'
                  : 'This MVP generates realistic mock data today — the structure is ready to plug in a real AI model later.'}
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-16 border-t border-white/10 pt-8 text-xs text-white/50">
          CarnetAI — fast carnet lists for touring teams.
        </footer>
      </div>
    </div>
  );
}


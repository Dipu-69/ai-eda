import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { analyzeFile } from "../services/api";
import HeroPreview from "../components/HeroPreview";

const API_DOCS = (import.meta.env.VITE_API_URL || "") + "/docs";
const SAMPLE_URL = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv";

export default function Landing() {
  const navigate = useNavigate();
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState(null);

  async function trySample() {
    try {
      setLoadingSample(true);
      setError(null);
      const r = await fetch(SAMPLE_URL);
      const b = await r.blob();
      const f = new File([b], "sample_tips.csv", { type: "text/csv" });
      const res = await analyzeFile(f);
      navigate(`/dashboard/${res.analysis_id}`, { state: res });
    } catch (e) {
      setError("Couldn’t load sample dataset. Please try again.");
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-500/10 via-fuchsia-400/10 to-emerald-400/10" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-extrabold tracking-tight"
              >
                Upload Your Data → Get Instant Insights
              </motion.h1>
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                Automated EDA, interactive charts, and AI insights. No setup. Just results.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-5 py-3 hover:brightness-110 transition"
                >
                  Upload CSV/Excel
                </Link>
                <button
                  onClick={trySample}
                  disabled={loadingSample}
                  className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {loadingSample ? "Analyzing sample…" : "Try a sample dataset"}
                </button>
                <Link
  to="/api"
  className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
>
  API Docs
</Link>
              </div>
              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-500">
                <Badge>CSV</Badge>
                <Badge>Excel (.xlsx/.xls)</Badge>
                <Badge>Interactive Charts</Badge>
                <Badge>Download PDF/Excel</Badge>
                <Badge>Light/Dark</Badge>
              </div>
            </div>

            {/* Minimal live preview card (static chart image feel without data) */}
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-10">
        <SectionTitle title="How it works" subtitle="A simple 3‑step flow designed for speed." />
        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <Step
            title="1. Upload"
            desc="Drop a CSV or Excel file. We parse it fast and safely."
            icon={<UploadIcon />}
          />
          <Step
            title="2. Analyze"
            desc="Automated EDA, summary stats, correlations, and smart insights."
            icon={<AnalyzeIcon />}
          />
          <Step
            title="3. Explore & Export"
            desc="Interact with charts, filter data, and download a report."
            icon={<ExportIcon />}
          />
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-10">
        <SectionTitle title="What you get" subtitle="Everything you need for quick, confident analysis." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          <FeatureCard title="Data Summary" desc="Rows, columns, missingness, duplicates, and dtypes at a glance." />
          <FeatureCard title="Interactive Charts" desc="Histograms, bars, pie, scatter, heatmap, and time‑series." />
          <FeatureCard title="AI Insights" desc="Plain‑English takeaways: trends, relationships, anomalies." />
          <FeatureCard title="Filters" desc="Slice by categories; focus on what matters." />
          <FeatureCard title="Reports" desc="One‑click PDF/Excel exports for sharing." />
          <FeatureCard title="Privacy" desc="Data processed in-memory; analyses expire automatically." />
        </div>
      </section>

      {/* Supported + Privacy */}
      <section id="info" className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold">Supported formats</h3>
            <ul className="mt-3 text-sm list-disc pl-5 space-y-1">
              <li>CSV (comma/semicolon), UTF‑8 or Latin‑1</li>
              <li>Excel .xlsx / .xls</li>
              <li>Dates auto‑parsed; numeric/categorical detection</li>
            </ul>
          </Card>
          <Card>
            <h3 className="font-semibold">Privacy & limits</h3>
            <ul className="mt-3 text-sm list-disc pl-5 space-y-1">
              <li>Files analyzed in-memory; no permanent storage</li>
              <li>Temporary cache auto-expires</li>
              <li>For large files, start with a sample; export full report when ready</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* FAQ (no fluff, practical) */}
      <section id="faq" className="mx-auto max-w-6xl px-6 py-10">
        <SectionTitle title="FAQ" subtitle="Quick answers to common questions." />
        <div className="grid md:grid-cols-2 gap-5 mt-6">
          <FAQ q="Does it work with Excel?" a="Yes. .xlsx and .xls are supported." />
          <FAQ q="How big can my file be?" a="Depends on your host limits; if you hit a cap, start with a filtered sample." />
          <FAQ q="Can I download results?" a="Yes—PDF and Excel exports are available from the dashboard." />
          <FAQ q="Will my data be shared?" a="No. Your data is processed server‑side; analyses auto‑expire." />
        </div>
        <div className="mt-8">
          <Link to="/upload" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-5 py-3 hover:brightness-110 transition">
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded-full border px-3 py-1 text-xs">{children}</span>;
}
function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
function Card({ children }) {
  return (
    <div className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      {children}
    </div>
  );
}
function Step({ title, desc, icon }) {
  return (
    <div className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="flex items-start gap-4">
        <div className="shrink-0">{icon}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</div>
        </div>
      </div>
    </div>
  );
}
function FeatureCard({ title, desc }) {
  return (
    <div className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</div>
    </div>
  );
}
function FAQ({ q, a }) {
  return (
    <div className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="font-semibold">{q}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{a}</div>
    </div>
  );
}

// Simple inline icons
function UploadIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" className="text-brand-600">
      <path fill="currentColor" d="M5 20h14v-2H5v2Zm7-16l-5 5h3v4h4v-4h3l-5-5Z"/>
    </svg>
  );
}
function AnalyzeIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" className="text-brand-600">
      <path fill="currentColor" d="M3 3h18v2H3V3Zm0 16h18v2H3v-2ZM5 8h2v8H5V8Zm6 0h2v8h-2V8Zm6 0h2v8h-2V8Z"/>
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" className="text-brand-600">
      <path fill="currentColor" d="M5 20h14v-2H5v2Zm7-16v8l3-3 1.41 1.41L12 16.83 7.59 12.4 9 11l3 3V4h0Z"/>
    </svg>
  );
}

// Decorative preview card (no data required)
function PreviewCard() {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur border border-gray-200/70 dark:border-gray-700 p-5">
      <div className="text-sm font-medium">Preview</div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-gradient-to-tr from-brand-500/20 to-emerald-400/20" />
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Interactive charts and insights appear after you upload or try the sample.
      </p>
    </div>
  );
}
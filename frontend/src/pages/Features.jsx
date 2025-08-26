import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { analyzeFile } from "../services/api";

const SAMPLE_URL = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv";

export default function Features() {
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
      setError(e?.message || "Couldn’t load sample dataset. Please try again.");
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      {/* Hero */}
      <section className="text-left">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Everything you need to get insights fast</h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
          Upload a CSV/Excel, explore interactive charts, get plain‑English insights, and a quick forecast when there’s a time series.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/upload" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-5 py-3 hover:brightness-110 transition">
            Upload your data
          </Link>
          <button
            onClick={trySample}
            disabled={loadingSample}
            className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {loadingSample ? "Analyzing sample…" : "Try a sample dataset"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </section>

      {/* Feature grid */}
      <section>
        <h2 className="text-xl font-semibold">Core features</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard icon={<IconBolt />} title="Automated EDA" desc="Data summary, missingness, dtypes, duplicates, and quick column stats." />
          <FeatureCard icon={<IconChart />} title="Interactive charts" desc="Histograms, bar/pie, scatter, correlation heatmap, and time‑series." />
          <FeatureCard icon={<IconSpark />} title="AI insights" desc="Plain‑English takeaways: strongest relationships, skew, dominant categories, trends." />
          <FeatureCard icon={<IconSlider />} title="Filters" desc="Slice by categories to focus on what matters (client-side, fast)." />
          <FeatureCard icon={<IconForecast />} title="Forecast" desc="Detects date + target and produces a trend+seasonality forecast with backtest metrics." />
          <FeatureCard icon={<IconShield />} title="Privacy" desc="Data is processed server‑side and kept only in a short‑lived memory cache." />
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-3 grid md:grid-cols-3 gap-4">
          <Step n={1} title="Upload" desc="CSV/Excel is parsed with robust fallbacks (encoding/date formats)." />
          <Step n={2} title="Analyze" desc="Automated EDA + insight generation + chart-ready series." />
          <Step n={3} title="Forecast" desc="If there’s a date/time and numeric target, a quick forecast is provided." />
        </ol>
      </section>

      {/* CTA */}
      <section className="rounded-xl p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Ready to explore your data?</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Upload a file or use the sample and jump straight into charts and insights.</div>
          </div>
          <div className="flex gap-3">
            <Link to="/upload" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 hover:brightness-110">
              Upload now
            </Link>
            <button onClick={trySample} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
              Use sample
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="font-semibold">{title}</div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">{desc}</div>
    </div>
  );
}
function Step({ n, title, desc }) {
  return (
    <li className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="text-xs text-gray-500">Step {n}</div>
      <div className="font-semibold mt-1">{title}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</div>
    </li>
  );
}

// Inline icons (lightweight, no deps)
function IconBolt() {
  return (<svg width="28" height="28" viewBox="0 0 24 24" className="text-brand-600"><path fill="currentColor" d="M13 2L3 14h6l-2 8 10-12h-6l2-8Z"/></svg>);
}
function IconChart() {
  return (<svg width="28" height="28" viewBox="0 0 24 24" className="text-brand-600"><path fill="currentColor" d="M3 3h18v2H3V3Zm0 16h18v2H3v-2ZM5 8h2v8H5V8Zm6 0h2v8h-2V8Zm6 0h2v8h-2V8Z"/></svg>);
}
function IconSpark() {
  return (<svg width="28" height="28" viewBox="0 0 24 24" className="text-brand-600"><path fill="currentColor" d="M11 3h2v6h-2V3Zm6.36 2.64l1.41 1.41-4.24 4.24-1.41-1.41 4.24-4.24ZM3 11h6v2H3v-2Zm14.36 7.36l-4.24-4.24 1.41-1.41 4.24 4.24-1.41 1.41ZM11 15h2v6h-2v-6Z"/></svg>);
}
function IconSlider() {
  return (<svg width="28" height="28" viewBox="0 0 24 24" className="text-brand-600"><path fill="currentColor" d="M10 8H3V6h7V4l4 3-4 3V8Zm4 8h7v2h-7v2l-4-3 4-3v2Z"/></svg>);
}
function IconForecast() {
  return (<svg width="28" height="28" viewBox="0 0 24 24" className="text-brand-600"><path fill="currentColor" d="M3 17l6-6 4 4 7-7 1.5 1.5L13 18l-4-4-5.5 5.5L3 17Z"/></svg>);
}
function IconShield() {
  return (<svg width="28" height="28" viewBox="0 0 24 24" className="text-brand-600"><path fill="currentColor" d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4Z"/></svg>);
}
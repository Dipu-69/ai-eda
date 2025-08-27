// ReportPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import NavBar from "../components/NavBar";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function ReportPage() {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [aiHtml, setAiHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiTried, setAiTried] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/analysis/${analysisId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setAnalysis(data);

        try {
          const resAI = await fetch(`${API_BASE}/ai-report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysis_id: analysisId }),
          });
          setAiTried(true);
          if (resAI.ok) {
            const { html } = await resAI.json();
            if (alive) setAiHtml(html || "");
          }
        } catch {
          setAiTried(true);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [analysisId]);

  const summary = analysis?.summary || {};
  const forecast = analysis?.forecast || null;

  const defaultHtml = useMemo(() => {
    if (!analysis) return "";
    const rows = summary.rows ?? "—";
    const cols = summary.columns ?? "—";
    const missing = summary.missing_total ?? "—";
    const dups = summary.duplicate_rows ?? "—";
    const insights = analysis.insights || [];

    const spark = (() => {
      if (!forecast?.forecast?.y_hat?.length) return "";
      const data = forecast.forecast.y_hat.slice(-60);
      const w = 420, h = 64, p = 6;
      const min = Math.min(...data), max = Math.max(...data);
      const xs = (i) => p + (i * (w - 2 * p)) / (data.length - 1);
      const ys = (v) => p + (h - 2 * p) * (1 - (v - min) / Math.max(1e-9, max - min));
      const pts = data.map((v, i) => `${xs(i)},${ys(v)}`).join(" ");
      return `
        <figure class="ql-figure">
          <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
            <polyline fill="none" stroke="#7C3AED" stroke-width="2" points="${pts}" />
          </svg>
          <figcaption>Recent forecast sparkline (${data.length} pts)</figcaption>
        </figure>
      `;
    })();

    const nextTotal = (() => {
      if (!forecast?.forecast?.y_hat?.length) return null;
      const sum = forecast.forecast.y_hat.reduce((a, b) => a + (b || 0), 0);
      return Math.round(sum * 100) / 100;
    })();

    const metrics = forecast?.metrics || {};
    const metaLine = [
      analysis?.detected?.dateCol ? `Date: ${analysis.detected.dateCol}` : null,
      analysis?.detected?.target ? `Target: ${analysis.detected.target}` : null,
      analysis?.detected?.agg ? `Agg: ${analysis.detected.agg}` : null,
      analysis?.detected?.freq ? `Freq: ${analysis.detected.freq}` : null,
    ].filter(Boolean).join(" • ");

    return `
      <h2>Executive Summary</h2>
      <div class="ql-callout">
        <p>The dataset includes <b>${rows}</b> rows and <b>${cols}</b> columns. Missing values total <b>${missing}</b> with <b>${dups}</b> duplicate rows detected.</p>
        ${metaLine ? `<p class="ql-subtle">Detected — ${metaLine}.</p>` : ""}
        ${nextTotal !== null ? `<p class="ql-subtle">Projected total for the next horizon: <b>${fmtNum(nextTotal)}</b>.</p>` : ""}
      </div>

      <h3>Key Insights</h3>
      <ul class="ql-list">
        ${insights.slice(0, 8).map(s => `<li>${escapeHtml(s)}</li>`).join("") || "<li>No notable issues detected.</li>"}
      </ul>

      <h3>Forecast Overview</h3>
      <p>${escapeHtml(forecast?.note || "Trend + simple seasonality model.")}</p>
      <div class="ql-metrics">
        ${num(metrics?.mae) ? `<div class="ql-metric"><div class="k">MAE</div><div class="v">${fmt(metrics.mae)}</div></div>` : ""}
        ${num(metrics?.rmse) ? `<div class="ql-metric"><div class="k">RMSE</div><div class="v">${fmt(metrics.rmse)}</div></div>` : ""}
        ${num(metrics?.mape) ? `<div class="ql-metric"><div class="k">MAPE</div><div class="v">${fmt(metrics.mape)}%</div></div>` : ""}
      </div>
      ${spark}

      <h3>Recommendations</h3>
      <ul class="ql-list ql-check">
        <li>Fix top-missing columns to improve reliability.</li>
        <li>Investigate strongest correlations for drivers and features.</li>
        <li>Track forecast error; consider richer models if MAPE is high.</li>
        <li>Set alerts for sudden shifts in daily/weekly aggregates.</li>
      </ul>

      <h3>Data Quality Notes</h3>
      <p>Review missingness by column and potential outliers. Consider imputation, winsorization, or domain rules as needed.</p>
    `;

    function num(x) { return typeof x === "number" && !isNaN(x); }
    function fmt(x) {
      return typeof x === "number" ? (Math.abs(x) >= 1000 ? x.toLocaleString() : x.toFixed(3)) : x;
    }
    function fmtNum(x) { return typeof x === "number" ? x.toLocaleString() : x; }
    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
  }, [analysis]);

  const htmlToRender = aiHtml || defaultHtml;

  async function downloadBackendPdfSilently() {
    if (!API_BASE) return alert("PDF server not configured.");
    try {
      const res = await fetch(`${API_BASE}/download-report?analysis_id=${analysisId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`PDF download failed: ${String(e)}`);
    }
  }

  const nfmt = (v) => typeof v === "number" ? (Math.abs(v) >= 1000 ? v.toLocaleString() : v) : v;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Keep the same site navbar */}
      <NavBar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-emerald-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">QueryLens</div>
              <h1 className="text-2xl font-extrabold tracking-tight">AI Report</h1>
              <p className="text-xs/relaxed opacity-90 mt-1">
                Generated at {new Date().toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-md bg-white/90 text-gray-900 px-3 py-1.5 text-sm hover:bg-white shadow-sm"
              >
                Download PDF
              </button>
              <button
                onClick={downloadBackendPdfSilently}
                className="rounded-md bg-white/90 text-gray-900 px-3 py-1.5 text-sm hover:bg-white shadow-sm"
              >
                Server PDF
              </button>
              <Link
                to={`/dashboard/${analysisId}`}
                className="rounded-md bg-white/10 border border-white/30 px-3 py-1.5 text-sm hover:bg-white/20"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-6 print:px-0">
        {!loading && !error && analysis && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="Rows" value={nfmt(summary.rows ?? "—")} />
            <StatCard label="Columns" value={nfmt(summary.columns ?? "—")} />
            <StatCard label="Missing" value={nfmt(summary.missing_total ?? "—")} />
            <StatCard label="Duplicates" value={nfmt(summary.duplicate_rows ?? "—")} />
          </section>
        )}

        {!loading && !error && analysis?.detected && (
          <div className="flex flex-wrap gap-2 mb-4">
            {analysis.detected.dateCol && <Chip>📅 {analysis.detected.dateCol}</Chip>}
            {analysis.detected.target && <Chip>🎯 {analysis.detected.target}</Chip>}
            {analysis.detected.agg && <Chip>∑ {analysis.detected.agg}</Chip>}
            {analysis.detected.freq && <Chip>⏱ {analysis.detected.freq}</Chip>}
          </div>
        )}

        {loading && <Skeleton />}

        {error && (
          <div className="rounded-lg border border-red-300/60 bg-red-50 text-red-700 p-3 text-sm">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <section className="rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-800 p-5">
            {!aiHtml && aiTried && API_BASE && (
              <div className="text-xs text-gray-500 mb-2">AI narrative unavailable, showing fallback summary.</div>
            )}
            <article
              className="ql-article prose prose-sm sm:prose md:prose-lg max-w-none dark:prose-invert prose-headings:mt-4 prose-p:my-2 prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: htmlToRender }}
            />
          </section>
        )}

        {!loading && !error && forecast && (
          <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SmallMetric label="Horizon" value={nfmt(forecast.horizon)} />
            <SmallMetric label="Frequency" value={forecast.freq || "—"} />
            <SmallMetric label="MAE" value={fmtNum(forecast.metrics?.mae)} />
            <SmallMetric label="MAPE" value={fmtPct(forecast.metrics?.mape)} />
          </section>
        )}
      </div>

      <style>{`
        .ql-article h2, .ql-article h3 { margin-top: 0.25rem; margin-bottom: 0.5rem; }
        .ql-article h2 {
          font-size: 1.25rem; font-weight: 700;
          background: linear-gradient(135deg, #7C3AED, #10B981);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .ql-article h3 { font-size: 1.05rem; font-weight: 600; }
        .ql-callout {
          border: 1px solid rgba(107,114,128,0.25);
          background: rgba(124,58,237,0.06);
          border-radius: 12px; padding: 12px 14px; margin: 8px 0 10px;
        }
        .ql-callout .ql-subtle { color: #6b7280; margin-top: 4px; }
        .ql-metrics {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px; margin: 8px 0 10px;
        }
        .ql-metric { border: 1px solid rgba(229,231,235,0.7); border-radius: 10px; padding: 8px 10px; background: rgba(255,255,255,0.6); }
        .ql-metric .k { font-size: 11px; color: #6b7280; }
        .ql-metric .v { font-weight: 600; font-size: 14px; margin-top: 2px; }
        .ql-list { padding-left: 1.1rem; }
        .ql-list li { margin: 4px 0; }
        .ql-list.ql-check { list-style: none; padding-left: 0; }
        .ql-list.ql-check li { position: relative; padding-left: 22px; }
        .ql-list.ql-check li::before { content: "✓"; position: absolute; left: 0; top: 0; color: #10B981; font-weight: 700; }
        .ql-figure { margin: 10px 0 0; }
        .ql-figure figcaption { color: #6b7280; font-size: 12px; margin-top: 2px; }

        @media print {
          @page { margin: 0.6in; }
          .sticky, a, button { display: none !important; }
          body { background: #fff !important; }
          .prose { font-size: 12pt; }
        }
      `}</style>
    </div>
  );
}

/* Helpers */
function StatCard({ label, value }) {
  return (
    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-800">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
function SmallMetric({ label, value }) {
  return (
    <div className="rounded-lg p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-800">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-base font-semibold mt-0.5">{value ?? "—"}</div>
    </div>
  );
}
function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      {children}
    </span>
  );
}
function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  );
}
function fmtNum(x) {
  if (x == null || isNaN(x)) return "—";
  return Math.abs(x) >= 1000 ? Number(x).toLocaleString() : Number(x).toFixed(3);
}
function fmtPct(x) {
  if (x == null || isNaN(x)) return "—";
  return `${Number(x).toFixed(2)}%`;
}
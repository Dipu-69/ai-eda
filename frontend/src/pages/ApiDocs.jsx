import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, analyzeFile } from "../services/api";
import NavBar from "../components/NavBar";

export default function ApiDocs() {
  const [health, setHealth] = useState({ ok: false, error: null, count: null });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [errUpload, setErrUpload] = useState(null);

  const hasApi = !!API_BASE; // but we never render the URL

  useEffect(() => {
    if (!hasApi) return;
    checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApi]);

  async function checkHealth() {
    if (!hasApi) {
      setHealth({ ok: false, error: "API not configured", count: null });
      return;
    }
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/health`, { cache: "no-store" });
      const j = await res.json();
      setHealth({ ok: true, error: null, count: j?.count ?? null });
    } catch (e) {
      setHealth({ ok: false, error: e?.message || "Failed", count: null });
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErrUpload(null); setResult(null);
    try {
      const res = await analyzeFile(file);
      setResult(res);
      try { sessionStorage.setItem(`analysis:${res.analysis_id}`, JSON.stringify(res)); } catch {}
    } catch (e) {
      setErrUpload(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function openAiReportTab() {
    if (!result) return;
    try { sessionStorage.setItem(`analysis:${result.analysis_id}`, JSON.stringify(result)); } catch {}
    window.open(`${window.location.origin}/report/${result.analysis_id}`, "_blank", "noopener,noreferrer");
  }

  async function downloadBackendPdfSilently() {
    if (!result || !hasApi) return;
    try {
      const url = `${API_BASE.replace(/\/$/, "")}/download-report?analysis_id=${result.analysis_id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `report_${result.analysis_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert(`PDF download failed: ${String(e)}`);
    }
  }

  // Only placeholders shown in docs
  const sampleBase = "https://api.yourdomain.com";

  const curlAnalyze = useMemo(() => {
    return `curl -X POST \\
  -F "file=@data.csv" \\
  "${sampleBase}/analyze"`;
  }, []);

  const jsAnalyze = useMemo(() => {
    return `const form = new FormData();
form.append("file", fileInput.files[0]);
const res = await fetch("${sampleBase}/analyze", { method: "POST", body: form });
const json = await res.json();
console.log(json.analysis_id);`;
  }, []);

  const curlGet = useMemo(() => `curl "${sampleBase}/analysis/{analysis_id}"`, []);
  const curlAi = useMemo(() => `curl -X POST "${sampleBase}/ai-report" \\
  -H "Content-Type: application/json" \\
  -d '{"analysis_id":"{analysis_id}"}'`, []);
  const curlPdf = useMemo(() => `curl -L -o report_{analysis_id}.pdf "${sampleBase}/download-report?analysis_id={analysis_id}"`, []);

  return (
    <>
      <NavBar />

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">API Documentation</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Upload CSV/Excel to get automated EDA, insights, a quick forecast, AI narrative, and a downloadable PDF.
          </p>
        </header>

        {/* Status (no URL shown) */}
        <section className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${health.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-sm">{health.ok ? "API online" : "API offline"}</span>
            <button onClick={checkHealth} className="ml-3 rounded border px-3 py-1.5 text-sm">Check</button>
          </div>
          {health.count != null && (
            <div className="mt-2 text-xs text-gray-500">
              Active analyses (in-memory): <b>{health.count}</b>
            </div>
          )}
          {!hasApi && (
            <div className="mt-2 text-xs text-yellow-600">
              Note: API is not configured in this build.
            </div>
          )}
          {health.error && (
            <div className="mt-2 text-xs text-red-500">{health.error}</div>
          )}
        </section>

        {/* Endpoints (generic, no hostnames) */}
        <section>
          <h2 className="text-xl font-semibold">Endpoints</h2>

          <Endpoint method="GET" path="/health" desc="Health check and brief server stats." res={{ status: "ok", count: 0 }} />

          <Endpoint
            method="POST"
            path="/analyze"
            desc="Upload CSV/Excel. Returns EDA summary, charts, insights, and optional forecast."
            reqNote="multipart/form-data with field name 'file'."
            res={{
              analysis_id: "uuid",
              summary: { rows: 123, columns: 7, missing_total: 12, duplicate_rows: 0, dtypes: {} },
              columns: [{ name: "col", dtype: "float64", missing: 0, unique: 12, sample_values: [] }],
              charts: { histograms: [], barCounts: [], pie: null, heatmap: null, scatter: null, timeseries: null },
              forecast: { /* if date + numeric target detected */ },
              insights: ["..."],
              preview_rows: [{ /* first 50 rows */ }],
              detected: { dateCol: "Order Date", target: "Sales", agg: "sum", freq: "D" },
              forecast_reason: ""
            }}
          />

          <Endpoint method="GET" path="/analysis/{analysis_id}" desc="Retrieve a previously computed analysis by ID (cached in memory ~24h)." />

          <Endpoint
            method="POST"
            path="/ai-report"
            desc="Generate AI narrative HTML. Accepts { analysis_id } or { analysis: {...} }."
            reqNote='Content-Type: application/json. Body: {"analysis_id":"<uuid>"} or {"analysis":{...}}'
            res={{ html: "<h1>Executive Summary</h1>..." }}
          />

          <Endpoint method="GET" path="/download-report?analysis_id={id}" desc="Download a printer‑friendly PDF (server‑rendered)." />
        </section>

        {/* Code samples (placeholders only) */}
        <section>
          <h2 className="text-xl font-semibold">Code samples</h2>
          <div className="mt-3 grid md:grid-cols-2 gap-4">
            <CodeBlock title="curl (upload CSV)" code={curlAnalyze} />
            <CodeBlock title="curl (get analysis)" code={curlGet} />
            <CodeBlock title="curl (AI report)" code={curlAi} />
            <CodeBlock title="curl (download PDF)" code={curlPdf} />
            <CodeBlock title="JavaScript (browser fetch)" code={jsAnalyze} />
          </div>
        </section>

        {/* Try it (no backend URL displayed) */}
        <section className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Try it</h2>
          <div className="mt-3 text-sm">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} disabled={busy} />
            {busy && <span className="ml-3 text-gray-500">Uploading…</span>}
          </div>
          {errUpload && <div className="mt-2 text-sm text-red-500">{errUpload}</div>}

          {result && (
            <div className="mt-4 space-y-3">
              <div className="text-sm">
                Analysis ID: <b>{result.analysis_id}</b>{" "}
                <Link className="underline text-brand-600" to={`/dashboard/${result.analysis_id}`} state={result}>
                  Open dashboard
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openAiReportTab}
                  className="rounded border px-3 py-1.5 text-sm"
                  title="Open AI narrative in a new tab (printable)"
                >
                  Open AI Report
                </button>
                <button
                  onClick={downloadBackendPdfSilently}
                  className="rounded border px-3 py-1.5 text-sm"
                  title="Download backend PDF"
                  disabled={!hasApi}
                >
                  Download PDF
                </button>
              </div>

              <pre className="mt-2 text-xs bg-black/5 dark:bg-white/5 p-3 rounded overflow-auto max-h-72">
{JSON.stringify({
  analysis_id: result.analysis_id,
  summary: result.summary,
  detected: result.detected,
  insights: (result.insights || []).slice(0,3)
}, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Endpoint({ method, path, desc, reqNote, res }) {
  const color =
    method === "GET"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  return (
    <div className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 mt-4">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{method}</span>
        <code className="text-sm">{path}</code>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</div>
      {reqNote && <div className="mt-2 text-xs text-gray-500"><b>Request:</b> {reqNote}</div>}
      {res && (
        <div className="mt-3">
          <div className="text-xs text-gray-500">Response (example)</div>
          <pre className="mt-1 text-xs bg-black/5 dark:bg-white/5 p-3 rounded overflow-auto">
{JSON.stringify(res, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ title, code }) {
  async function copy() {
    try { await navigator.clipboard.writeText(code); } catch {}
  }
  return (
    <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <button onClick={copy} className="text-xs rounded border px-2 py-1">Copy</button>
      </div>
      <pre className="mt-2 text-xs bg-black/5 dark:bg-white/5 p-3 rounded overflow-auto">{code}</pre>
    </div>
  );
}
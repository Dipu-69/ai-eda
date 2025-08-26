import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, analyzeFile } from "../services/api";

export default function ApiDocs() {
  const navigate = useNavigate();
  const base = (API_BASE || "").replace(/\/$/, "");
  const [health, setHealth] = useState({ ok: false, data: null, error: null });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [errUpload, setErrUpload] = useState(null);

  useEffect(() => {
    if (!base) return;
    checkHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  async function checkHealth() {
    if (!base) {
      setHealth({ ok: false, data: null, error: "VITE_API_URL not set" });
      return;
    }
    try {
      const res = await fetch(`${base}/health`, { cache: "no-store" });
      const j = await res.json();
      setHealth({ ok: true, data: j, error: null });
    } catch (e) {
      setHealth({ ok: false, data: null, error: e?.message || "Failed" });
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErrUpload(null); setResult(null);
    try {
      const res = await analyzeFile(file);
      setResult(res);
    } catch (e) {
      setErrUpload(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const curlAnalyze = useMemo(() => {
    const b = base || "https://your-api.example.com";
    return `curl -X POST \\\n  -F "file=@data.csv" \\\n  "${b}/analyze"`;
  }, [base]);

  const jsAnalyze = useMemo(() => {
    const b = base || "https://your-api.example.com";
    return `const form = new FormData();\nform.append("file", fileInput.files[0]);\nconst res = await fetch("${b}/analyze", { method: "POST", body: form });\nconst json = await res.json();\nconsole.log(json.analysis_id);`;
  }, [base]);

  const curlGet = useMemo(() => {
    const b = base || "https://your-api.example.com";
    return `curl "${b}/analysis/{analysis_id}"`;
  }, [base]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">API Documentation</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Minimal REST API for automated EDA, AI insights, and a lightweight forecast. Upload a CSV/Excel and get chart‑ready JSON.
        </p>
      </header>

      {/* Base + Status */}
      <section className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Base URL</div>
            <div className="font-mono text-sm mt-1">{base || "Set VITE_API_URL in the frontend"}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${health.ok ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-sm">
              {health.ok ? "Online" : "Offline"}
            </span>
            <button onClick={checkHealth} className="ml-3 rounded border px-3 py-1.5 text-sm">Check</button>
            {base && (
              <a className="ml-2 rounded bg-brand-600 text-white px-3 py-1.5 text-sm"
                 href={`${base}/docs`} target="_blank" rel="noreferrer">
                Open Swagger UI
              </a>
            )}
          </div>
        </div>
        {health.data && (
          <div className="mt-3 text-xs text-gray-500">
            Active analyses: <b>{health.data.count}</b>
          </div>
        )}
        {health.error && (
          <div className="mt-2 text-xs text-red-500">{health.error}</div>
        )}
      </section>

      {/* Endpoints */}
      <section>
        <h2 className="text-xl font-semibold">Endpoints</h2>

        <Endpoint
          method="GET"
          path="/health"
          desc="Health check and brief server stats."
          res={{
            status: "ok",
            count: 0
          }}
        />

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
            forecast: { /* optional: if date + numeric target detected */ },
            insights: ["..."],
            preview_rows: [{ /* first 50 rows */ }],
            detected: { dateCol: "Order Date", target: "Sales", agg: "sum", freq: "D" },
            forecast_reason: ""
          }}
        />

        <Endpoint
          method="GET"
          path="/analysis/{analysis_id}"
          desc="Retrieve a previously computed analysis by ID (cached in memory for ~24h)."
        />
      </section>

      {/* Code samples */}
      <section>
        <h2 className="text-xl font-semibold">Code samples</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <CodeBlock title="curl (upload CSV)" code={curlAnalyze} />
          <CodeBlock title="curl (get analysis)" code={curlGet} />
          <CodeBlock title="JavaScript (browser fetch)" code={jsAnalyze} />
          <CodeBlock title="Axios (browser)" code={`const form = new FormData();\nform.append("file", file);\nconst res = await axios.post("${base || "https://your-api.example.com"}/analyze", form, {\n  headers: { "Content-Type": "multipart/form-data" }\n});\nconsole.log(res.data.analysis_id);`} />
        </div>
      </section>

      {/* Try it */}
      <section className="rounded-xl p-5 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
        <h2 className="text-xl font-semibold">Try it</h2>
        <div className="mt-3 text-sm">
          <input type="file" accept=".csv,.xlsx,.xls,.zip" onChange={handleUpload} disabled={busy} />
          {busy && <span className="ml-3 text-gray-500">Uploading…</span>}
        </div>
        {errUpload && <div className="mt-2 text-sm text-red-500">{errUpload}</div>}
        {result && (
          <div className="mt-4">
            <div className="text-sm">
              Analysis ID: <b>{result.analysis_id}</b>{" "}
              <Link className="underline text-brand-600" to={`/dashboard/${result.analysis_id}`} state={result}>
                Open dashboard
              </Link>
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
  );
}

function Endpoint({ method, path, desc, reqNote, res }) {
  const color = method === "GET" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
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
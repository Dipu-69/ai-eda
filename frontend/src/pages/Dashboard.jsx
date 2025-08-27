import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import useIsMobile from "../hooks/useIsMobile";
import { downloadReportPDF, getAnalysis } from "../services/api";
import SummaryCards from "../components/SummaryCards";
import ChartGrid from "../components/ChartGrid";
import InsightsPanel from "../components/InsightsPanel";
import Filters from "../components/Filters";
import ForecastBox from "../components/ForecastBox";
import NavBar from "../components/NavBar"; // <-- added

export default function Dashboard() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(location.state || null);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);

  const isMobile = useIsMobile(768);
  const maxRows = isMobile ? 5 : 30;

  // Always refetch when id changes
  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      if (data?.analysis_id === id) return; // already loaded this one
      setLoading(true);
      setError(null);
      try {
        const res = await getAnalysis(id);
        if (!active) return;
        setData(res);
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "Failed to load analysis. It may have expired.";
        if (active) setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (data?.preview_rows) {
      setFilteredRows(data.preview_rows);
    }
  }, [data]);

  const openAiReport = () => {
    if (!id) return;
    const url = `${window.location.origin}/report/${id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="mx-auto max-w-6xl px-6 py-10">Loading analysis…</div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <NavBar />
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-3">
          <p className="text-sm text-red-500">
            {error || "No analysis data found."}
          </p>
          <button
            className="rounded border px-3 py-2 text-sm"
            onClick={() => {
              setError(null);
              if (id) {
                setLoading(true);
                getAnalysis(id)
                  .then((res) => setData(res))
                  .catch((e) =>
                    setError(
                      e?.response?.data?.detail ||
                        e?.message ||
                        "Failed to load analysis."
                    )
                  )
                  .finally(() => setLoading(false));
              }
            }}
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  const { summary, columns, charts, insights, forecast, detected, forecast_reason } = data;
  const totalPreview = data?.preview_rows?.length || 0;
  const visibleCount = Math.min(filteredRows?.length ?? 0, maxRows);

  return (
    <>
      <NavBar />

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Dashboard</h2>
            {(detected?.dateCol || detected?.target) && (
              <div className="mt-1 text-xs text-gray-500">
                Detected • {detected?.dateCol ? `Date: ${detected.dateCol}` : ""}
                {detected?.dateCol && detected?.target ? " • " : ""}
                {detected?.target ? `Target: ${detected.target}` : ""}
                {detected?.agg ? ` • Agg: ${detected.agg}` : ""}
                {detected?.freq ? ` • Freq: ${detected.freq}` : ""}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadReportPDF(id)}
              className="rounded border px-3 py-2 text-sm"
              title="Download summary, insights, and key plots as a PDF"
            >
              Download PDF
            </button>
            <button
              onClick={openAiReport}
              className="rounded border px-3 py-2 text-sm"
              title="Open AI-generated narrative report (printable)"
            >
              AI Report
            </button>
          </div>
        </div>

        {/* KPIs */}
        <SummaryCards summary={summary} />

        {/* AI Forecast box */}
        {forecast ? (
          <ForecastBox forecast={forecast} />
        ) : (
          <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
            <div className="text-sm">No forecast available.</div>
            <div className="text-xs text-gray-500 mt-1">
              {forecast_reason ? `Reason: ${forecast_reason}. ` : ""}
              Tip: include a date/time column and a numeric target (e.g., sales, revenue). The backend also tries weekly/monthly aggregation if daily data is sparse.
            </div>
          </div>
        )}

        {/* Charts */}
        <ChartGrid charts={charts} forecast={forecast} showForecastChart={false} />

        {/* AI Insights */}
        <InsightsPanel insights={insights} profileUrl={undefined} />

        {/* Filters */}
        <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Filters</h3>
            <div className="text-xs text-gray-500">
              Showing <b>{visibleCount}</b> of <b>{totalPreview}</b> rows {isMobile ? "(mobile view)" : ""}
            </div>
          </div>

          <Filters
            columns={columns}
            data={data.preview_rows}
            onFiltered={setFilteredRows}
          />

          <p className="mt-2 text-[11px] text-gray-500 hidden sm:block">
            Note: filters apply to the preview (first 50 rows). For big datasets, wire server-side filtering if needed.
          </p>
        </div>

        {/* Data preview */}
        <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Data Preview</h3>
            <div className="text-xs text-gray-500 sm:hidden">
              Showing <b>{visibleCount}</b> of <b>{totalPreview}</b>
            </div>
          </div>

          {filteredRows?.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm table-mobile">
                <thead>
                  <tr>
                    {Object.keys(filteredRows[0] || {}).map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2 text-left border-b border-gray-200 dark:border-gray-700"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, maxRows).map((row, idx) => (
                    <tr
                      key={idx}
                      className="odd:bg-gray-50/50 dark:odd:bg-gray-800/40"
                    >
                      {Object.values(row).map((v, i) => (
                        <td
                          key={i}
                          className="px-2 py-1 border-b border-gray-100 dark:border-gray-800"
                          title={String(v ?? "")}
                        >
                          {String(v ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No rows to display.</p>
          )}
        </div>
      </div>
    </>
  );
}
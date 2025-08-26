import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getAnalysis } from "../services/api";
import SummaryCards from "../components/SummaryCards";
import ChartGrid from "../components/ChartGrid";
import InsightsPanel from "../components/InsightsPanel";
import Filters from "../components/Filters";
import ForecastBox from "../components/ForecastBox";

export default function Dashboard() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(location.state || null);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);

  // Robust fetch: always refetch when id changes
  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      if (data?.analysis_id === id) return; // already loaded
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
    // do not depend on 'data' to avoid blocking refetch on id change
  }, [id]);

  useEffect(() => {
    if (data?.preview_rows) {
      setFilteredRows(data.preview_rows);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        Loading analysis…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-3">
        <p className="text-sm text-red-500">{error || "No analysis data found."}</p>
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
    );
  }

  const { summary, columns, charts, insights, forecast, detected, forecast_reason } = data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
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
      </div>

      <SummaryCards summary={summary} />

      {/* AI Forecast box */}
      {forecast ? (
        <ForecastBox forecast={forecast} />
      ) : (
        <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <div className="text-sm">No forecast available.</div>
          <div className="text-xs text-gray-500 mt-1">
            {forecast_reason ? `Reason: ${forecast_reason}. ` : ""}
            Tip: include a date/time column and a numeric target (e.g., sales, revenue).
            The backend also tries weekly/monthly aggregation if daily data is sparse.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
        <h3 className="font-semibold mb-3">Filters</h3>
        <Filters columns={columns} data={data.preview_rows} onFiltered={setFilteredRows} />
      </div>

      {/* Charts (hide forecast chart here to avoid duplication with ForecastBox) */}
      <ChartGrid charts={charts} forecast={forecast} showForecastChart={false} />

      <InsightsPanel insights={insights} profileUrl={undefined} />

      {/* Data preview */}
      <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border">
        <h3 className="font-semibold mb-3">Data Preview</h3>
        {filteredRows?.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {Object.keys(filteredRows[0] || {}).map((h) => (
                    <th key={h} className="px-2 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 30).map((row, idx) => (
                  <tr key={idx} className="odd:bg-gray-50/50 dark:odd:bg-gray-800/40">
                    {Object.values(row).map((v, i) => (
                      <td key={i} className="px-2 py-1 border-b border-gray-100 dark:border-gray-800">
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
  );
}
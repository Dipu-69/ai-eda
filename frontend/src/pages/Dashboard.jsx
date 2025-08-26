import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { getAnalysis, downloadReport } from "../services/api";
import SummaryCards from "../components/SummaryCards";
import ChartGrid from "../components/ChartGrid";
import InsightsPanel from "../components/InsightsPanel";
import Filters from "../components/Filters";

export default function Dashboard() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(location.state || null);
  const [filteredRows, setFilteredRows] = useState([]);

  useEffect(() => {
    if (!data && id) {
      getAnalysis(id).then(setData).catch(() => {});
    }
  }, [id, data]);

  useEffect(() => {
    if (data) setFilteredRows(data.preview_rows || []);
  }, [data]);

  if (!data) return <div className="mx-auto max-w-6xl px-6 py-10">Loading analysis…</div>;

  const { summary, columns, charts, insights, profile_url } = data;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={() => downloadReport(id, "pdf")} className="rounded border px-3 py-2">Download PDF</button>
          <button onClick={() => downloadReport(id, "xlsx")} className="rounded border px-3 py-2">Download Excel</button>
        </div>
      </div>

      <SummaryCards summary={summary} />

      <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
        <h3 className="font-semibold mb-3">Filters</h3>
        <Filters columns={columns} data={data.preview_rows} onFiltered={setFilteredRows} />
      </div>

      <ChartGrid charts={charts} />

      <InsightsPanel insights={insights} profileUrl={profile_url} />

      <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border">
        <h3 className="font-semibold mb-3">Data Preview</h3>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {Object.keys((filteredRows[0] || {})).map((h) => (
                  <th key={h} className="px-2 py-2 text-left border-b border-gray-200 dark:border-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(filteredRows || []).slice(0, 30).map((row, idx) => (
                <tr key={idx} className="odd:bg-gray-50/50 dark:odd:bg-gray-800/40">
                  {Object.values(row).map((v, i) => (
                    <td key={i} className="px-2 py-1 border-b border-gray-100 dark:border-gray-800">{String(v ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
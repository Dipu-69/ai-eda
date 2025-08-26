import Plot from "react-plotly.js";

export default function ChartGrid({ charts }) {
  const { histograms, barCounts, pie, heatmap, scatter, timeseries } = charts || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(histograms || []).slice(0,2).map((h) => (
        <div key={h.column} className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <Plot
            data={[{
              x: h.bins.slice(0, -1).map((b, i) => (b + h.bins[i+1]) / 2),
              y: h.counts,
              type: "bar"
            }]}
            layout={{ title: `Histogram - ${h.column}`, autosize: true, margin: { t: 40, r: 10, l: 40, b: 40 } }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      ))}

      {(barCounts || []).slice(0,2).map((b) => (
        <div key={b.column} className="rounded-xl p-3 bg-white dark:bg-gray-800 border">
          <Plot
            data={[{ type: "bar", x: b.labels, y: b.counts }]}
            layout={{ title: `Top Categories - ${b.column}`, autosize: true, margin: { t: 40, r: 10, l: 40, b: 80 } }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      ))}

      {pie && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border">
          <Plot
            data={[{ type: "pie", labels: pie.labels, values: pie.values, hole: 0.3 }]}
            layout={{ title: `Distribution - ${pie.column}`, autosize: true, margin: { t: 40, r: 10, l: 10, b: 10 } }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {scatter && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border">
          <Plot
            data={[{ x: scatter.x, y: scatter.y, mode: "markers", type: "scatter", marker: { size: 6 } }]}
            layout={{ title: `Scatter: ${scatter.xCol} vs ${scatter.yCol}`, autosize: true, margin: { t: 40, r: 10, l: 40, b: 40 } }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {heatmap && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border md:col-span-2">
          <Plot
            data={[{ z: heatmap.matrix, x: heatmap.columns, y: heatmap.columns, type: "heatmap", colorscale: "RdBu" }]}
            layout={{ title: "Correlation Heatmap", autosize: true, margin: { t: 40, r: 10, l: 60, b: 80 } }}
            style={{ width: "100%", height: 380 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {timeseries && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border md:col-span-2">
          <Plot
            data={(timeseries.series || []).map((s) => ({ x: s.x, y: s.y, type: "scatter", mode: "lines", name: s.metric }))}
            layout={{ title: `Time Series (${timeseries.dateCol})`, autosize: true, margin: { t: 40, r: 10, l: 40, b: 40 } }}
            style={{ width: "100%", height: 360 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}
    </div>
  );
}
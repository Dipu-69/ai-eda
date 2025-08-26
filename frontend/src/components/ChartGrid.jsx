import Plot from "react-plotly.js";

export default function ChartGrid({ charts = {}, forecast, showForecastChart = true }) {
  const {
    histograms = [],
    barCounts = [],
    pie = null,
    heatmap = null,
    scatter = null,
    timeseries = null,
  } = charts || {};

  const hasAny =
    (histograms && histograms.length > 0) ||
    (barCounts && barCounts.length > 0) ||
    !!pie || !!heatmap || !!scatter || !!timeseries ||
    (showForecastChart && !!forecast);

  if (!hasAny) {
    return (
      <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          No charts available for this dataset.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Histograms */}
      {(histograms || []).slice(0, 2).map((h, idx) => {
        const bins = h?.bins || [];
        const mids = bins.length > 1 ? bins.slice(0, -1).map((b, i) => (b + bins[i + 1]) / 2) : [];
        return (
          <div
            key={`hist-${h?.column || idx}`}
            className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700"
          >
            <Plot
              data={[
                {
                  x: mids,
                  y: h?.counts || [],
                  type: "bar",
                  marker: { color: "#6C5CE7" },
                },
              ]}
              layout={{
                title: `Histogram - ${h?.column || ""}`,
                autosize: true,
                margin: { t: 40, r: 10, l: 40, b: 40 },
              }}
              style={{ width: "100%", height: 300 }}
              config={{ displayModeBar: false, responsive: true }}
            />
          </div>
        );
      })}

      {/* Bar counts */}
      {(barCounts || []).slice(0, 2).map((b, idx) => (
        <div
          key={`bar-${b?.column || idx}`}
          className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700"
        >
          <Plot
            data={[
              {
                type: "bar",
                x: b?.labels || [],
                y: b?.counts || [],
                marker: { color: "#43A5E3" },
              },
            ]}
            layout={{
              title: `Top Categories - ${b?.column || ""}`,
              autosize: true,
              margin: { t: 40, r: 10, l: 40, b: 80 },
            }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      ))}

      {/* Pie */}
      {pie && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <Plot
            data={[
              {
                type: "pie",
                labels: pie?.labels || [],
                values: pie?.values || [],
                hole: 0.3,
              },
            ]}
            layout={{
              title: `Distribution - ${pie?.column || ""}`,
              autosize: true,
              margin: { t: 40, r: 10, l: 10, b: 10 },
            }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {/* Scatter */}
      {scatter && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <Plot
            data={[
              {
                x: scatter?.x || [],
                y: scatter?.y || [],
                mode: "markers",
                type: "scatter",
                marker: { size: 6, color: "#10B981" },
              },
            ]}
            layout={{
              title: `Scatter: ${scatter?.xCol || ""} vs ${scatter?.yCol || ""}`,
              autosize: true,
              margin: { t: 40, r: 10, l: 40, b: 40 },
            }}
            style={{ width: "100%", height: 300 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {/* Heatmap */}
      {heatmap && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 md:col-span-2">
          <Plot
            data={[
              {
                z: heatmap?.matrix || [],
                x: heatmap?.columns || [],
                y: heatmap?.columns || [],
                type: "heatmap",
                colorscale: "RdBu",
                reversescale: true,
                zmin: -1,
                zmax: 1,
                hoverongaps: false,
              },
            ]}
            layout={{
              title: "Correlation Heatmap",
              autosize: true,
              margin: { t: 40, r: 10, l: 60, b: 80 },
            }}
            style={{ width: "100%", height: 380 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {/* Time series */}
      {timeseries && (timeseries.series || []).length > 0 && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 md:col-span-2">
          <Plot
            data={(timeseries.series || []).map((s, idx) => ({
              x: s?.x || [],
              y: s?.y || [],
              type: "scatter",
              mode: "lines",
              name: s?.metric || `Series ${idx + 1}`,
            }))}
            layout={{
              title: `Time Series (${timeseries?.dateCol || "date"})`,
              autosize: true,
              margin: { t: 40, r: 10, l: 40, b: 40 },
            }}
            style={{ width: "100%", height: 360 }}
            config={{ displayModeBar: false, responsive: true }}
          />
        </div>
      )}

      {/* Forecast chart (optional) */}
      {showForecastChart && forecast && forecast.backtest && forecast.forecast && (
        <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 md:col-span-2">
          <Plot
            data={[
              {
                x: forecast?.backtest?.x || [],
                y: forecast?.backtest?.y_true || [],
                type: "scatter",
                mode: "lines",
                name: "Actual",
                line: { color: "#374151" },
              },
              {
                x: forecast?.backtest?.x || [],
                y: forecast?.backtest?.y_hat || [],
                type: "scatter",
                mode: "lines",
                name: "Model",
                line: { color: "#6366F1" },
              },
              {
                x: forecast?.forecast?.x || [],
                y: forecast?.forecast?.y_hat || [],
                type: "scatter",
                mode: "lines",
                name: "Forecast",
                line: { color: "#10B981", dash: "dot" },
              },
            ]}
            layout={{
              title: `Forecast (${forecast?.target || "target"})`,
              autosize: true,
              margin: { t: 40, r: 10, l: 40, b: 40 },
            }}
            style={{ width: "100%", height: 360 }}
            config={{ displayModeBar: false, responsive: true }}
          />
          <div className="mt-2 text-xs text-gray-500">
            {typeof forecast?.metrics?.mae === "number" ? `MAE: ${forecast.metrics.mae.toFixed(3)} • ` : ""}
            {typeof forecast?.metrics?.rmse === "number" ? `RMSE: ${forecast.metrics.rmse.toFixed(3)} • ` : ""}
            {typeof forecast?.metrics?.mape === "number" ? `MAPE: ${forecast.metrics.mape.toFixed(2)}%` : ""}
            {forecast?.note ? ` — ${forecast.note}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
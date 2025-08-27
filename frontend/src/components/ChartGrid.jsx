import { useEffect, useMemo, useState } from "react";
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

  const isSmall = useIsSmallScreen(); // < 640px

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {/* Histograms */}
      {(histograms || []).slice(0, 2).map((h, idx) => {
        const bins = h?.bins || [];
        const mids = bins.length > 1 ? bins.slice(0, -1).map((b, i) => (b + bins[i + 1]) / 2) : [];
        return (
          <Card key={`hist-${h?.column || idx}`} title={`Histogram — ${h?.column || ""}`} subtitle="X: values • Y: count">
            <ResponsivePlot
              data={[
                { x: mids, y: h?.counts || [], type: "bar", marker: { color: "#6C5CE7" } },
              ]}
              layout={{
                xaxis: {
                  title: `Values of ${h?.column || ""}`,
                  automargin: true,
                  tickangle: isSmall ? -30 : 0,
                  tickfont: { size: isSmall ? 10 : 12 },
                },
                yaxis: {
                  title: "Count",
                  automargin: true,
                  tickfont: { size: isSmall ? 10 : 12 },
                  tickformat: "~s",
                },
              }}
              mobileHeight={230}
              desktopHeight={300}
            />
          </Card>
        );
      })}

      {/* Bar counts */}
      {(barCounts || []).slice(0, 2).map((b, idx) => (
        <Card
          key={`bar-${b?.column || idx}`}
          title={`Top categories — ${b?.column || ""}`}
          subtitle="X: category • Y: count (top 10)"
        >
          <ResponsivePlot
            data={[
              {
                type: "bar",
                x: b?.labels || [],
                y: b?.counts || [],
                marker: { color: "#43A5E3" },
              },
            ]}
            layout={{
              margin: { b: isSmall ? 80 : 60 },
              xaxis: {
                title: `${b?.column || ""} (category)`,
                tickangle: isSmall ? -35 : -20,
                automargin: true,
                tickfont: { size: isSmall ? 10 : 12 },
              },
              yaxis: {
                title: "Count",
                automargin: true,
                tickfont: { size: isSmall ? 10 : 12 },
                tickformat: "~s",
              },
            }}
            mobileHeight={240}
            desktopHeight={300}
          />
        </Card>
      ))}

      {/* Pie */}
      {pie && (
        <Card title={`Distribution — ${pie?.column || ""}`} subtitle="Slice size = share of total (top 8)">
          <ResponsivePlot
            data={[
              {
                type: "pie",
                labels: pie?.labels || [],
                values: pie?.values || [],
                textinfo: isSmall ? "percent" : "label+percent",
                hovertemplate: "%{label}: %{percent} (%{value})<extra></extra>",
                hole: 0.35,
              },
            ]}
            layout={{
              showlegend: !isSmall, // labels already on slices for small screens
            }}
            mobileHeight={260}
            desktopHeight={300}
          />
        </Card>
      )}

      {/* Scatter */}
      {scatter && (
        <Card
          title={`Scatter — ${scatter?.yCol || ""} vs ${scatter?.xCol || ""}`}
          subtitle={`X: ${scatter?.xCol || ""} • Y: ${scatter?.yCol || ""}`}
        >
          <ResponsivePlot
            data={[
              {
                x: scatter?.x || [],
                y: scatter?.y || [],
                mode: "markers",
                type: "scatter",
                marker: { size: isSmall ? 4 : 6, color: "#10B981" },
              },
            ]}
            layout={{
              xaxis: { title: scatter?.xCol || "X", automargin: true, tickfont: { size: isSmall ? 10 : 12 } },
              yaxis: { title: scatter?.yCol || "Y", automargin: true, tickfont: { size: isSmall ? 10 : 12 }, tickformat: "~s" },
            }}
            mobileHeight={240}
            desktopHeight={300}
          />
        </Card>
      )}

      {/* Heatmap */}
      {heatmap && (
        <Card
          title="Correlation heatmap (Pearson r)"
          subtitle="Cells show correlation between numeric features; red=positive, blue=negative"
          wide
        >
          <ResponsivePlot
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
                colorbar: { title: "r" },
                hoverongaps: false,
                showscale: !isSmall, // save space on phones
              },
            ]}
            layout={{
              margin: { l: isSmall ? 60 : 80, b: isSmall ? 60 : 80 },
              xaxis: { title: "Features", automargin: true, tickfont: { size: isSmall ? 9 : 12 } },
              yaxis: { title: "Features", automargin: true, tickfont: { size: isSmall ? 9 : 12 } },
            }}
            mobileHeight={300}
            desktopHeight={380}
          />
        </Card>
      )}

      {/* Time series */}
      {timeseries && (timeseries.series || []).length > 0 && (
        <Card
          title={`Time series — daily mean by ${timeseries?.dateCol || "date"}`}
          subtitle="X: date • Y: value (daily mean)"
          wide
        >
          <ResponsivePlot
            data={(timeseries.series || []).map((s, idx) => ({
              x: s?.x || [],
              y: s?.y || [],
              type: "scatter",
              mode: "lines",
              name: s?.metric || `Series ${idx + 1}`,
            }))}
            layout={{
              xaxis: {
                title: "Date",
                automargin: true,
                tickangle: isSmall ? -35 : 0,
                tickfont: { size: isSmall ? 10 : 12 },
              },
              yaxis: {
                title: "Value",
                automargin: true,
                tickfont: { size: isSmall ? 10 : 12 },
                tickformat: "~s",
              },
              legend: {
                orientation: "h",
                y: -0.28, // below chart
                x: 0.5,
                xanchor: "center",
                font: { size: isSmall ? 10 : 12 },
                itemwidth: 30,
              },
              showlegend: isSmall ? (timeseries?.series?.length || 0) <= 3 : true,
            }}
            mobileHeight={280}
            desktopHeight={360}
          />
        </Card>
      )}

      {/* Forecast chart */}
      {showForecastChart && forecast && forecast.backtest && forecast.forecast && (
        <Card
          title={`Forecast — ${forecast?.target || "target"} (${forecast?.freq || ""})`}
          subtitle="X: date • Y: forecasted value"
          wide
        >
          <ResponsivePlot
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
              xaxis: { title: "Date", automargin: true, tickangle: isSmall ? -35 : 0, tickfont: { size: isSmall ? 10 : 12 } },
              yaxis: { title: forecast?.target || "Value", automargin: true, tickfont: { size: isSmall ? 10 : 12 }, tickformat: "~s" },
              legend: {
                orientation: "h",
                y: -0.3,
                x: 0.5,
                xanchor: "center",
                font: { size: isSmall ? 10 : 12 },
              },
            }}
            mobileHeight={280}
            desktopHeight={360}
          />
          <div className="mt-2 text-xs text-gray-500">
            {typeof forecast?.metrics?.mae === "number" ? `MAE: ${formatNumber(forecast.metrics.mae)} • ` : ""}
            {typeof forecast?.metrics?.rmse === "number" ? `RMSE: ${formatNumber(forecast.metrics.rmse)} • ` : ""}
            {typeof forecast?.metrics?.mape === "number" ? `MAPE: ${forecast.metrics.mape.toFixed(2)}%` : ""}
            {forecast?.note ? ` — ${forecast.note}` : ""}
          </div>
        </Card>
      )}
    </div>
  );
}

function Card({ title, subtitle, children, wide = false }) {
  return (
    <div className={`rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 ${wide ? "md:col-span-2" : ""} min-w-0 overflow-hidden`}>
      <div className="mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle ? <div className="text-xs text-gray-500">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

/* ---------- helpers ---------- */
function useIsSmallScreen(bp = 640) {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const onChange = () => setIsSmall(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [bp]);
  return isSmall;
}

function ResponsivePlot({ layout = {}, config = {}, style = {}, mobileHeight = 240, desktopHeight = 300, ...rest }) {
  const isSmall = useIsSmallScreen();
  const mergedLayout = useMemo(
    () => ({
      autosize: true,
      margin: { t: 10, r: 10, l: isSmall ? 46 : 60, b: isSmall ? 60 : 50, ...(layout.margin || {}) },
      font: { size: isSmall ? 10 : 12, ...(layout.font || {}) },
      ...layout,
    }),
    [layout, isSmall]
  );
  const mergedConfig = useMemo(
    () => ({
      displayModeBar: false,
      responsive: true,
      ...config,
    }),
    [config]
  );

  const h = style?.height ?? (isSmall ? mobileHeight : desktopHeight);

  return (
    <Plot
      useResizeHandler
      style={{ width: "100%", height: h, ...style }}
      layout={mergedLayout}
      config={mergedConfig}
      {...rest}
    />
  );
}

function formatNumber(n) {
  if (Math.abs(n) >= 1000) return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(n);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(n);
}
import { useMemo } from "react";
import Plot from "react-plotly.js";

export default function HeroPreview() {
  const demo = useMemo(() => {
    const len = 60;         // history points
    const horizon = 14;     // forecast points

    // Build date axis
    const start = new Date();
    start.setDate(start.getDate() - (len - 1));
    const histX = Array.from({ length: len }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const futX = Array.from({ length: horizon }, (_, i) => {
      const d = new Date(histX[histX.length - 1]);
      d.setDate(d.getDate() + i + 1);
      return d.toISOString().slice(0, 10);
    });

    // Synthetic series: baseline + trend + weekly seasonality + smooth noise (deterministic)
    const y = Array.from({ length: len }, (_, i) => {
      const base = 120;
      const trend = i * 1.6;                       // upward trend
      const season = 20 * Math.sin((2 * Math.PI * i) / 7); // weekly
      const noise = 6 * Math.sin(i * 0.42) + 4 * Math.cos(i * 0.27);
      return Math.max(0, base + trend + season + noise);
    });

    // Simple linear regression for forecast (trend-only, keeps this tiny)
    const xIdx = Array.from({ length: len }, (_, i) => i);
    const meanX = xIdx.reduce((a, b) => a + b, 0) / len;
    const meanY = y.reduce((a, b) => a + b, 0) / len;
    const covXY = xIdx.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0);
    const varX = xIdx.reduce((acc, xi) => acc + (xi - meanX) ** 2, 0);
    const slope = varX === 0 ? 0 : covXY / varX;
    const intercept = meanY - slope * meanX;

    // Forecast with a touch of weekly seasonality from the last 7-day mean
    const last7 = y.slice(-7);
    const seasonMean = last7.reduce((a, b) => a + b, 0) / Math.max(1, last7.length);
    const futY = Array.from({ length: horizon }, (_, k) => {
      const t = len + k;
      const trendPart = intercept + slope * t;
      const seasonPart = 0.15 * seasonMean * Math.sin((2 * Math.PI * (t % 7)) / 7);
      return Math.max(0, trendPart + seasonPart);
    });

    // KPIs
    const nextTotal = futY.reduce((a, b) => a + b, 0);
    const lastWindow = y.slice(-horizon);
    const prevTotal = lastWindow.reduce((a, b) => a + b, 0);
    const deltaPct = prevTotal ? ((nextTotal - prevTotal) / prevTotal) * 100 : null;
    const nextFirst = futY[0];

    // Backtest quality (quick look)
    const tail = Math.max(10, Math.floor(len * 0.2));
    const yHatTail = xIdx.slice(-tail).map((t, i) => intercept + slope * (len - tail + i));
    const yTrueTail = y.slice(-tail);
    const mae =
      yTrueTail.reduce((acc, v, i) => acc + Math.abs(v - yHatTail[i]), 0) / tail;

    return {
      histX,
      y,
      futX,
      futY,
      kpis: { nextTotal, deltaPct, nextFirst, mae },
    };
  }, []);

  return (
    <div className="rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur border border-gray-200/70 dark:border-gray-700 p-5">
      <div className="text-sm font-medium">Preview</div>

      {/* KPIs */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <KPI label="Next 14 total" value={fmt(demo.kpis.nextTotal)} />
        <KPI
          label="Change vs last 14"
          value={
            demo.kpis.deltaPct == null
              ? "—"
              : `${demo.kpis.deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(demo.kpis.deltaPct).toFixed(1)}%`
          }
          tone={demo.kpis.deltaPct == null ? "muted" : demo.kpis.deltaPct >= 0 ? "up" : "down"}
        />
        <KPI label="Next period" value={fmt(demo.kpis.nextFirst)} />
      </div>

      {/* Mini chart */}
      <div className="mt-3">
        <Plot
          data={[
            {
              x: demo.histX,
              y: demo.y,
              type: "scatter",
              mode: "lines",
              name: "History",
              line: { color: "#6C5CE7", width: 2 },
              fill: "tozeroy",
              fillcolor: "rgba(108,92,231,0.12)",
            },
            {
              x: demo.futX,
              y: demo.futY,
              type: "scatter",
              mode: "lines",
              name: "Forecast",
              line: { color: "#10B981", width: 2, dash: "dot" },
            },
          ]}
          layout={{
            autosize: true,
            margin: { t: 10, r: 10, l: 40, b: 30 },
            xaxis: { showgrid: false, ticklen: 3 },
            yaxis: { gridcolor: "rgba(0,0,0,0.06)" },
            legend: { orientation: "h", y: -0.2 },
          }}
          style={{ width: "100%", height: 220 }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Demo data shown. Upload or try the sample to see your own charts and forecast.
      </p>
    </div>
  );
}

function KPI({ label, value, tone = "muted" }) {
  const color =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-red-600" : "text-gray-900 dark:text-gray-100";
  return (
    <div className="rounded-lg border border-gray-200/70 dark:border-gray-700 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function fmt(n) {
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(2);
}
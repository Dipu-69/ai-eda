import Plot from "react-plotly.js";

export default function ForecastBox({ forecast }) {
  if (!forecast || !forecast.forecast || !forecast.backtest) {
    return null;
  }

  const horizon = Number(forecast.horizon) || (forecast.forecast?.y_hat?.length || 0);
  const nextValues = (forecast.forecast?.y_hat || []).map(Number);
  const nextTotal = sum(nextValues);
  const nextFirst = nextValues.length ? nextValues[0] : null;

  const histY = (forecast.backtest?.y_true || []).map(Number);
  const prevLen = Math.min(horizon, histY.length);
  const prevTotal = prevLen ? sum(histY.slice(histY.length - prevLen)) : null;
  const deltaPct = prevTotal && prevTotal !== 0 ? ((nextTotal - prevTotal) / prevTotal) * 100 : null;

  const trendColor = deltaPct == null ? "text-gray-500" : deltaPct >= 0 ? "text-emerald-600" : "text-red-600";
  const trendBadge = deltaPct == null ? "—" : `${deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(deltaPct).toFixed(1)}%`;

  // Tiny chart: last 60 backtest points + forecast
  const lastN = 60;
  const btX = forecast.backtest.x || [];
  const btY = forecast.backtest.y_true || [];
  const btYhat = forecast.backtest.y_hat || [];
  const btStart = Math.max(0, btX.length - lastN);

  return (
    <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">AI Forecast</div>
          <div className="font-semibold">
            {forecast.target || "Target"} • {forecast.dateCol || "Date"}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Horizon: {horizon} {horizon === 1 ? "period" : "periods"}
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-3 gap-4">
        <KPI label={`Next ${horizon} total`} value={fmt(nextTotal)} />
        <KPI label="Change vs last period" value={trendBadge} className={trendColor} />
        <KPI label="Next period" value={nextFirst != null ? fmt(nextFirst) : "—"} />
      </div>

      <div className="mt-4 grid sm:grid-cols-3 gap-4">
        <SmallMetric label="MAE" value={forecast.metrics?.mae} />
        <SmallMetric label="RMSE" value={forecast.metrics?.rmse} />
        <SmallMetric label="MAPE" value={forecast.metrics?.mape} suffix="%" />
      </div>

      <div className="mt-4">
        <Plot
          data={[
            {
              x: btX.slice(btStart),
              y: btY.slice(btStart),
              type: "scatter",
              mode: "lines",
              name: "Actual",
              line: { color: "#374151" },
            },
            {
              x: btX.slice(btStart),
              y: btYhat.slice(btStart),
              type: "scatter",
              mode: "lines",
              name: "Model",
              line: { color: "#6366F1" },
            },
            {
              x: forecast.forecast.x || [],
              y: nextValues,
              type: "scatter",
              mode: "lines",
              name: "Forecast",
              line: { color: "#10B981", dash: "dot" },
            },
          ]}
          layout={{
            title: `Forecast (${forecast.target})`,
            autosize: true,
            margin: { t: 40, r: 10, l: 40, b: 40 },
          }}
          style={{ width: "100%", height: 300 }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      {forecast.note && (
        <div className="mt-2 text-xs text-gray-500">{forecast.note}</div>
      )}
    </div>
  );
}

function KPI({ label, value, className = "" }) {
  return (
    <div className="rounded-lg border border-gray-200/70 dark:border-gray-700 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${className}`}>{value}</div>
    </div>
  );
}

function SmallMetric({ label, value, suffix = "" }) {
  const v = typeof value === "number" ? value.toFixed(suffix ? 2 : 3) : "—";
  return (
    <div className="rounded-lg border border-gray-200/70 dark:border-gray-700 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium mt-1">
        {v}{typeof value === "number" ? suffix : ""}
      </div>
    </div>
  );
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function fmt(n) {
  if (n == null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(2);
}
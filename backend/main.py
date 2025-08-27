import io
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse

app = FastAPI(title="AI EDA API (Smart Forecast)", version="1.2.0")

# Open CORS for dev/hosted frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache (TTL ~24h). Replace with Redis/DB if you want persistence.
ANALYSES: Dict[str, Dict[str, Any]] = {}
TTL_SECONDS = 24 * 3600


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/health")
def health():
    # cleanup expired
    now = time.time()
    stale = [k for k, v in ANALYSES.items() if now - v.get("created_at", now) > TTL_SECONDS]
    for k in stale:
        ANALYSES.pop(k, None)
    return {"status": "ok", "count": len(ANALYSES)}


# ----------------------------
# IO
# ----------------------------
def read_dataframe(file: UploadFile) -> pd.DataFrame:
    name = (file.filename or "upload").lower()
    content = file.file.read()
    if not content:
        raise HTTPException(400, "Empty file")
    try:
        if name.endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(content))
        else:
            # CSV with encoding fallback
            try:
                return pd.read_csv(io.BytesIO(content))
            except Exception:
                return pd.read_csv(io.BytesIO(content), encoding="latin-1")
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")


# ----------------------------
# Helpers
# ----------------------------
def coerce_dates(df: pd.DataFrame) -> List[str]:
    """Parse date-like columns aggressively; also synthesize from Year/Month[/Day] or MonthName."""
    dt_cols: List[str] = []

    # Already datetime
    for c in df.columns:
        if np.issubdtype(df[c].dtype, np.datetime64):
            dt_cols.append(c)

    def try_parse_series(s: pd.Series) -> Optional[pd.Series]:
        # Try multiple strategies including day-first
        for dayfirst in (False, True):
            parsed = pd.to_datetime(s.astype(str), errors="coerce", infer_datetime_format=True, dayfirst=dayfirst)
            if parsed.notna().mean() >= 0.4 and parsed.nunique(dropna=True) >= 6:
                return parsed
        return None

    # Parse object columns
    for c in df.columns:
        if c in dt_cols or df[c].dtype != object:
            continue
        parsed = try_parse_series(df[c])
        if parsed is not None:
            df[c] = parsed
            dt_cols.append(c)

    # Name hits (lower thresholds)
    name_hits = [
        c
        for c in df.columns
        if any(k in c.lower() for k in ["date", "time", "timestamp", "datetime", "orderdate", "order_date", "invoice", "sale", "created", "posted"])
    ]
    for c in name_hits:
        if c in dt_cols or np.issubdtype(df[c].dtype, np.datetime64):
            continue
        parsed = try_parse_series(df[c])
        if parsed is not None:
            df[c] = parsed
            dt_cols.append(c)

    # Synthesize from Year/Month/Day integer columns
    lower = {c.lower(): c for c in df.columns}
    y, m, d = lower.get("year"), lower.get("month"), lower.get("day")
    if y and m and "__auto_date__" not in df.columns:
        try:
            day_vals = df[d] if d else 1
            synth = pd.to_datetime(dict(year=df[y], month=df[m], day=day_vals), errors="coerce")
            if synth.notna().sum() >= 6:
                df["__auto_date__"] = synth
                dt_cols.append("__auto_date__")
        except Exception:
            pass

    # Synthesize from Year + MonthName (e.g., Jan/January)
    mn = lower.get("monthname") or lower.get("month_name") or lower.get("month name")
    if lower.get("year") and mn and "__auto_date2__" not in df.columns:
        try:
            short = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}

            def to_month(v):
                s = str(v).strip().lower()
                if s[:3] in short:
                    return short[s[:3]]
                try:
                    n = int(s)
                    return n if 1 <= n <= 12 else None
                except Exception:
                    return None

            month_num = pd.Series([to_month(v) for v in df[mn]])
            synth2 = pd.to_datetime(dict(year=df[lower["year"]], month=month_num, day=1), errors="coerce")
            if synth2.notna().sum() >= 6:
                df["__auto_date2__"] = synth2
                dt_cols.append("__auto_date2__")
        except Exception:
            pass

    return dt_cols


def summarize_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "memory_bytes": int(df.memory_usage(deep=True).sum()),
        "missing_total": int(df.isna().sum().sum()),
        "missing_by_col": {c: int(df[c].isna().sum()) for c in df.columns},
        "duplicate_rows": int(df.duplicated().sum()),
        "dtypes": df.dtypes.astype(str).to_dict(),
    }


def columns_meta(df: pd.DataFrame) -> List[Dict[str, Any]]:
    out = []
    for c in df.columns:
        ser = df[c]
        out.append(
            {
                "name": c,
                "dtype": str(ser.dtype),
                "missing": int(ser.isna().sum()),
                "unique": int(ser.nunique(dropna=True)),
                "sample_values": ser.dropna().astype(str).head(5).tolist(),
            }
        )
    return out


def chart_data(df: pd.DataFrame) -> Dict[str, Any]:
    charts: Dict[str, Any] = {}
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    dt_cols = [c for c in df.columns if np.issubdtype(df[c].dtype, np.datetime64)]

    sample = df.sample(min(2000, len(df)), random_state=42) if len(df) > 2000 else df.copy()

    # histograms
    hists = []
    for c in num_cols[:6]:
        s = sample[c].dropna()
        if len(s) == 0:
            continue
        cnts, bins = np.histogram(s, bins=20)
        hists.append({"column": c, "bins": bins.tolist(), "counts": cnts.tolist()})

    # bar counts
    bars = []
    for c in cat_cols[:6]:
        vc = sample[c].astype(str).fillna("NaN").value_counts().head(10)
        bars.append({"column": c, "labels": vc.index.tolist(), "counts": vc.values.tolist()})

    # pie
    pie = None
    if cat_cols:
        vc = sample[cat_cols[0]].astype(str).fillna("NaN").value_counts().head(8)
        pie = {"column": cat_cols[0], "labels": vc.index.tolist(), "values": vc.values.tolist()}

    # heatmap + scatter
    heatmap = None
    scatter = None
    if len(num_cols) >= 2:
        corr = sample[num_cols].corr(numeric_only=True).fillna(0.0)
        heatmap = {"columns": num_cols, "matrix": corr.values.round(4).tolist()}
        A = corr.abs().values.copy()
        np.fill_diagonal(A, 0)
        i, j = np.unravel_index(np.argmax(A), A.shape)
        xcol, ycol = num_cols[i], num_cols[j]
        pts = sample[[xcol, ycol]].dropna().head(500)
        if len(pts):
            scatter = {"xCol": xcol, "yCol": ycol, "x": pts[xcol].tolist(), "y": pts[ycol].tolist()}

    # time series
    timeseries = None
    if dt_cols:
        tcol = dt_cols[0]
        tmp = sample.dropna(subset=[tcol]).copy()
        if not tmp.empty:
            tmp["_d"] = pd.to_datetime(tmp[tcol], errors="coerce")
            num_cols2 = tmp.select_dtypes(include=[np.number]).columns.tolist()
            if num_cols2:
                grp = (
                    tmp.set_index("_d")
                    .sort_index()
                    .resample("D")[num_cols2[:2]]
                    .mean()
                    .dropna(how="all")
                    .head(400)
                )
                timeseries = {
                    "dateCol": tcol,
                    "series": [
                        {"metric": c, "x": grp.index.strftime("%Y-%m-%d").tolist(), "y": grp[c].fillna(0).tolist()}
                        for c in grp.columns
                    ],
                }

    charts["histograms"] = hists
    charts["barCounts"] = bars
    charts["pie"] = pie
    charts["heatmap"] = heatmap
    charts["scatter"] = scatter
    charts["timeseries"] = timeseries
    return charts


def pick_target(df: pd.DataFrame) -> Tuple[Optional[str], str]:
    """Pick a numeric target; ignore ID-like columns; prefer sales-like names; choose agg."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    rows = len(df)
    if not num_cols:
        return None, "sum"

    def is_idlike(col: str) -> bool:
        u = df[col].nunique(dropna=True)
        return rows > 0 and (u / rows) >= 0.98

    candidates = [c for c in num_cols if not is_idlike(c) and df[c].notna().sum() >= 6] or num_cols

    prefs_sum = [
        "sales",
        "revenue",
        "amount",
        "qty",
        "quantity",
        "units",
        "orders",
        "profit",
        "turnover",
        "count",
        "gmv",
        "visits",
        "views",
        "clicks",
        "volume",
        "sold",
    ]
    prefs_mean = ["price", "cost", "rate", "avg", "average", "margin"]

    lower = {c.lower(): c for c in candidates}
    for p in prefs_sum:
        for lc, orig in lower.items():
            if p in lc:
                return orig, "sum"
    for p in prefs_mean:
        for lc, orig in lower.items():
            if p in lc:
                return orig, "mean"

    var = df[candidates].var(numeric_only=True).fillna(0.0)
    if len(var):
        return var.sort_values(ascending=False).index[0], "sum"
    return candidates[0], "sum"


def pick_date_col(df: pd.DataFrame) -> Optional[str]:
    dt_cols = [c for c in df.columns if np.issubdtype(df[c].dtype, np.datetime64)]
    if not dt_cols:
        return None
    # pick the one with most unique timestamps (must have at least 6 unique)
    dt_cols_sorted = sorted(dt_cols, key=lambda c: df[c].nunique(dropna=True), reverse=True)
    top = dt_cols_sorted[0]
    return top if df[top].nunique(dropna=True) >= 6 else None


def simple_forecast(
    df: pd.DataFrame, date_col: str, target: str, agg: str = "sum", freq: str = "auto", horizon: Optional[int] = None
) -> Tuple[Optional[Dict[str, Any]], str]:
    """Trend + simple seasonality with D→W→M fallback. Needs a few aggregated points."""
    try:
        s = df[[date_col, target]].copy()
        s[date_col] = pd.to_datetime(s[date_col], errors="coerce")
        s = s.dropna(subset=[date_col, target])
        if s.empty:
            return None, "no_valid_rows_after_parsing"

        s = s.set_index(date_col).sort_index()
        freqs = ["D", "W", "M"] if freq == "auto" else [freq]
        mins = {"D": 10, "W": 6, "M": 4}  # forgiving minimums
        default_h = {"D": 14, "W": 8, "M": 6}

        last_reason = "unknown"
        for f in freqs:
            y = s[target].resample(f).sum().dropna() if agg == "sum" else s[target].resample(f).mean().dropna()
            if len(y) < mins[f]:
                last_reason = f"insufficient_points_{f.lower()}={len(y)}"
                continue

            dfm = y.to_frame("y")
            dfm["t"] = np.arange(len(dfm))
            # Seasonality: D/W -> day-of-week; M -> month
            if f in ("D", "W"):
                season_idx = dfm.index.dayofweek
                season_ohe = pd.get_dummies(season_idx, prefix="dow")
            else:
                season_idx = dfm.index.month
                season_ohe = pd.get_dummies(season_idx, prefix="mon")

            X = np.column_stack([np.ones(len(dfm)), dfm["t"].values, season_ohe.values])
            beta, *_ = np.linalg.lstsq(X, dfm["y"].values, rcond=None)
            y_hat = X @ beta

            split = max(5, int(len(dfm) * 0.8))
            y_true_bt = dfm["y"].values[split:]
            y_hat_bt = y_hat[split:]
            mae = float(np.mean(np.abs(y_true_bt - y_hat_bt)))
            rmse = float(np.sqrt(np.mean((y_true_bt - y_hat_bt) ** 2)))
            mape = float(np.mean(np.abs((y_true_bt - y_hat_bt) / np.where(y_true_bt == 0, 1e-9, y_true_bt)))) * 100.0

            H = horizon or default_h[f]
            step = pd.tseries.frequencies.to_offset(f)
            future_idx = pd.date_range(dfm.index[-1] + step, periods=H, freq=f)
            # Future seasonality
            if f in ("D", "W"):
                f_season = pd.get_dummies(future_idx.dayofweek, prefix="dow")
            else:
                f_season = pd.get_dummies(future_idx.month, prefix="mon")
            for col in season_ohe.columns:
                if col not in f_season.columns:
                    f_season[col] = 0
            f_season = f_season[season_ohe.columns]

            X_future = np.column_stack([np.ones(len(future_idx)), np.arange(dfm["t"].iloc[-1] + 1, dfm["t"].iloc[-1] + 1 + H), f_season.values])
            y_future = X_future @ beta

            forecast = {
                "target": target,
                "dateCol": date_col,
                "horizon": H,
                "freq": f,
                "agg": agg,
                "metrics": {"mae": mae, "rmse": rmse, "mape": mape},
                "backtest": {
                    "x": dfm.index.astype(str).tolist()[split:],
                    "y_true": [float(v) for v in y_true_bt.tolist()],
                    "y_hat": [float(v) for v in y_hat_bt.tolist()],
                },
                "forecast": {
                    "x": future_idx.astype(str).tolist(),
                    "y_hat": [float(v) for v in y_future.tolist()],
                },
                "note": f"Trend + simple seasonal model on {f}-aggregated {target} ({agg}).",
            }
            return forecast, ""

        return None, last_reason
    except Exception as e:
        return None, f"forecast_error: {e}"


# -------- PDF helpers (ReportLab-only, no heavy deps) --------
def _color_from_corr(val: float):
    from reportlab.lib.colors import Color

    v = max(-1.0, min(1.0, float(val)))
    if v >= 0:
        r, g, b = 1.0, 1.0 - 0.6 * v, 1.0 - 0.6 * v
    else:
        v = abs(v)
        r, g, b = 1.0 - 0.6 * v, 1.0 - 0.6 * v, 1.0
    return Color(r, g, b)


def build_pdf(analysis: Dict[str, Any]) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm
    from reportlab.lib.colors import black, HexColor

    buff = io.BytesIO()
    c = canvas.Canvas(buff, pagesize=A4)
    width, height = A4

    summary = analysis.get("summary", {})
    charts = analysis.get("charts", {})
    insights = analysis.get("insights", [])
    forecast = analysis.get("forecast")

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(2 * cm, height - 2 * cm, "AI EDA Report")
    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, height - 2.6 * cm, f"Analysis ID: {analysis.get('analysis_id','')}")

    # Summary box
    c.setFont("Helvetica-Bold", 12)
    y = height - 3.4 * cm
    c.drawString(2 * cm, y, "Summary")
    y -= 0.6 * cm
    c.setFont("Helvetica", 10)
    c.drawString(
        2 * cm,
        y,
        f"Rows: {summary.get('rows',0)}   Columns: {summary.get('columns',0)}   Missing (total): {summary.get('missing_total',0)}   Duplicate rows: {summary.get('duplicate_rows',0)}",
    )
    y -= 0.8 * cm

    # Insights (first 8)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Insights")
    y -= 0.6 * cm
    c.setFont("Helvetica", 10)
    for ins in (insights or [])[:8]:
        c.drawString(2.2 * cm, y, f"- {ins}")
        y -= 0.5 * cm
        if y < 5 * cm:
            c.showPage()
            y = height - 3 * cm
            c.setFont("Helvetica-Bold", 12)
            c.drawString(2 * cm, y, "Insights (cont.)")
            y -= 0.6 * cm
            c.setFont("Helvetica", 10)

    # Forecast summary
    if forecast:
        c.setFont("Helvetica-Bold", 12)
        if y < 8 * cm:
            c.showPage()
            y = height - 3 * cm
        c.drawString(2 * cm, y, "Forecast")
        y -= 0.6 * cm
        c.setFont("Helvetica", 10)
        c.drawString(
            2 * cm,
            y,
            f"Target: {forecast.get('target','')}  •  Freq: {forecast.get('freq','')}  •  Horizon: {forecast.get('horizon',0)}",
        )
        y -= 0.5 * cm
        metrics = forecast.get("metrics", {})
        mtxt = "  ".join(
            [
                f"MAE: {metrics.get('mae',0):.3f}" if isinstance(metrics.get("mae"), (int, float)) else "",
                f"RMSE: {metrics.get('rmse',0):.3f}" if isinstance(metrics.get("rmse"), (int, float)) else "",
                f"MAPE: {metrics.get('mape',0):.2f}%" if isinstance(metrics.get("mape"), (int, float)) else "",
            ]
        ).strip()
        c.drawString(2 * cm, y, mtxt)
        y -= 0.8 * cm

    # Simple histogram of first numeric, drawn with rectangles
    histograms = (charts or {}).get("histograms") or []
    if histograms:
        h = histograms[0]
        counts = list(h.get("counts", []))
        if counts:
            if y < 9 * cm:
                c.showPage()
                y = height - 3 * cm
            c.setFont("Helvetica-Bold", 12)
            c.drawString(2 * cm, y, f"Histogram - {h.get('column','')}")
            y -= 0.6 * cm

            x0, y0, w, hgt = 2 * cm, y - 5.2 * cm, 7.5 * cm, 4.5 * cm
            c.setStrokeColor(black)
            c.rect(x0, y0, w, hgt, stroke=1, fill=0)
            maxc = max(counts) or 1
            bar_w = w / len(counts)
            c.setFillColor(HexColor("#6C5CE7"))
            for i, cnt in enumerate(counts):
                bh = (cnt / maxc) * (hgt - 0.2 * cm)
                c.rect(x0 + i * bar_w + 1, y0, bar_w - 2, bh, stroke=0, fill=1)
            y = y0 - 0.5 * cm

    # Correlation heatmap drawn as colored cells
    heatmap = (charts or {}).get("heatmap")
    if heatmap:
        cols = heatmap.get("columns") or []
        matrix = heatmap.get("matrix") or []
        n = len(cols)
        if n and len(matrix) == n:
            if y < 9 * cm:
                c.showPage()
                y = height - 3 * cm
            c.setFont("Helvetica-Bold", 12)
            c.drawString(11 * cm, height - 3.6 * cm, "Correlation Heatmap")
            size = 6.8 * cm
            x0, y0 = 11 * cm, height - 10.2 * cm
            cell = size / n
            c.setStrokeColor(black)
            c.rect(x0, y0, size, size, stroke=1, fill=0)
            for r in range(n):
                row = matrix[r]
                for col in range(n):
                    val = row[col]
                    c.setFillColor(_color_from_corr(val))
                    cx = x0 + col * cell
                    cy = y0 + (n - 1 - r) * cell
                    c.rect(cx, cy, cell, cell, stroke=0, fill=1)
            c.setFont("Helvetica", 6)
            for i, name in enumerate(cols):
                c.saveState()
                c.translate(x0 + i * cell + cell / 2, y0 + size + 0.15 * cm)
                c.rotate(45)
                c.drawCentredString(0, 0, str(name)[:16])
                c.restoreState()
            for i, name in enumerate(reversed(cols)):
                c.drawRightString(x0 - 0.1 * cm, y0 + i * cell + cell / 2 - 2, str(name)[:16])

    c.showPage()
    c.save()
    buff.seek(0)
    return buff.read()


def insights(df: pd.DataFrame, summary: Dict[str, Any], ch: Dict[str, Any], fc: Optional[Dict[str, Any]]) -> List[str]:
    out: List[str] = []
    # Missingness
    miss = summary.get("missing_by_col", {})
    if miss:
        top = sorted(miss.items(), key=lambda x: x[1], reverse=True)[:3]
        for c, v in top:
            if v > 0:
                pct = v / summary["rows"] * 100 if summary["rows"] else 0
                out.append(f"Column '{c}' has {v} missing values ({pct:.1f}%). Consider imputation or dropping.")
    # Correlations
    hm = ch.get("heatmap")
    if hm:
        cols = hm["columns"]
        mat = np.array(hm["matrix"])
        if mat.size:
            np.fill_diagonal(mat, 0)
            i, j = np.unravel_index(np.argmax(np.abs(mat)), mat.shape)
            val = float(mat[i, j])
            if abs(val) >= 0.6:
                out.append(f"Strong relationship between '{cols[i]}' and '{cols[j]}' (|r|={abs(val):.2f}).")
    # Dominant categories
    for b in ch.get("barCounts", [])[:2]:
        if b["labels"]:
            share = (b["counts"][0] / (sum(b["counts"]) or 1)) * 100
            out.append(f"In '{b['column']}', '{b['labels'][0]}' is the most frequent category ({share:.1f}%).")
    # Skewness
    for c in list(df.select_dtypes(include=[np.number]).columns)[:2]:
        s = df[c].dropna()
        if len(s) > 10:
            sk = float(s.skew())
            if abs(sk) > 1:
                out.append(f"'{c}' is {'right' if sk>0 else 'left'}-skewed (skew={sk:.2f}); consider transform or robust stats.")
    # Forecast
    if fc and fc.get("forecast"):
        next_total = float(np.sum(fc["forecast"]["y_hat"]))
        unit = fc.get("freq", "D")
        out.append(f"Forecast suggests total {fc['target']} of ~{next_total:.2f} over the next {fc['horizon']} {unit}-periods.")
    if not out:
        out.append("Data looks healthy. No strong trends or issues detected.")
    return out


# ----------------------------
# API
# ----------------------------
@app.post("/analyze")
def analyze(file: UploadFile = File(...)):
    df = read_dataframe(file)
    if df.empty:
        raise HTTPException(400, "No rows parsed from file.")

    # Parse dates for better detection
    coerce_dates(df)

    summary = summarize_dataframe(df)
    cols = columns_meta(df)
    charts = chart_data(df)

    # Detect and forecast
    date_col = pick_date_col(df)
    target, agg = pick_target(df)
    forecast: Optional[Dict[str, Any]] = None
    forecast_reason = ""
    if date_col and target:
        forecast, forecast_reason = simple_forecast(df, date_col, target, agg=agg, freq="auto", horizon=None)
    else:
        if not date_col and not target:
            forecast_reason = "no_date_and_no_numeric_target_detected"
        elif not date_col:
            forecast_reason = "no_date_column_detected"
        else:
            forecast_reason = "no_numeric_target_detected"

    ai = insights(df, summary, charts, forecast)

    analysis_id = str(uuid.uuid4())
    preview_rows = df.head(50).replace({np.nan: None}).to_dict(orient="records")

    payload = {
        "analysis_id": analysis_id,
        "summary": summary,
        "columns": cols,
        "charts": charts,
        "forecast": forecast,
        "forecast_reason": forecast_reason,
        "insights": ai,
        "detected": {
            "dateCol": date_col,
            "target": target,
            "agg": agg,
            "freq": forecast.get("freq") if forecast else None,
        },
        "preview_rows": preview_rows,
    }
    ANALYSES[analysis_id] = {"created_at": time.time(), **payload}
    return payload


@app.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: str):
    rec = ANALYSES.get(analysis_id)
    if not rec:
        raise HTTPException(404, "Analysis not found or expired.")
    return rec  # important: no trailing comma


@app.get("/download-report")
def download_report(analysis_id: str):
    data = ANALYSES.get(analysis_id)
    if not data:
        raise HTTPException(404, "Analysis not found or expired.")
    pdf_bytes = build_pdf(data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{analysis_id}.pdf"'},
    )
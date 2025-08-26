import io
import os
import uuid
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# Optional EDA provider
EDA_PROVIDER = os.getenv("EDA_PROVIDER", "").lower()  # "ydata" to enable profile generation
STATIC_DIR = Path("static")
(PROFILE_DIR := STATIC_DIR / "profiles").mkdir(parents=True, exist_ok=True)

app = FastAPI(title="AI EDA API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static for optional profiling HTML
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# In-memory store (swap with Redis/db for persistence)
ANALYSES: Dict[str, Dict[str, Any]] = {}
TTL_SECONDS = 24 * 3600

def _cleanup_store():
    now = time.time()
    stale = [k for k, v in ANALYSES.items() if now - v.get("created_at", now) > TTL_SECONDS]
    for k in stale:
        ANALYSES.pop(k, None)

class ColumnMeta(BaseModel):
    name: str
    dtype: str
    missing: int
    unique: Optional[int] = None
    sample_values: Optional[List[Any]] = None

class AnalyzeResponse(BaseModel):
    analysis_id: str
    summary: Dict[str, Any]
    columns: List[ColumnMeta]
    charts: Dict[str, Any]
    insights: List[str]
    preview_rows: List[Dict[str, Any]]
    profile_url: Optional[str] = None

def read_dataframe(file: UploadFile) -> pd.DataFrame:
    name = file.filename or "upload"
    content = file.file.read()
    if content is None or len(content) == 0:
        raise HTTPException(400, "Empty file")
    try:
        if name.lower().endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(content))
        else:
            # Robust CSV read
            try:
                return pd.read_csv(io.BytesIO(content))
            except Exception:
                return pd.read_csv(io.BytesIO(content), encoding="latin-1")
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")

def summarize_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    memory = int(df.memory_usage(deep=True).sum())
    dtypes = df.dtypes.astype(str).to_dict()
    missing_by_col = df.isna().sum().to_dict()
    summary = {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "memory_bytes": memory,
        "dtypes": dtypes,
        "missing_total": int(df.isna().sum().sum()),
        "missing_by_col": missing_by_col,
        "duplicate_rows": int(df.duplicated().sum()),
    }
    return summary

def build_columns_meta(df: pd.DataFrame) -> List[Dict[str, Any]]:
    cols = []
    for c in df.columns:
        ser = df[c]
        meta = {
            "name": c,
            "dtype": str(ser.dtype),
            "missing": int(ser.isna().sum()),
        }
        try:
            meta["unique"] = int(ser.nunique(dropna=True))
            meta["sample_values"] = ser.dropna().astype(str).head(5).tolist()
        except Exception:
            pass
        cols.append(meta)
    return cols

def build_chart_data(df: pd.DataFrame) -> Dict[str, Any]:
    charts: Dict[str, Any] = {}
    numerics = df.select_dtypes(include=[np.number]).columns.tolist()
    categoricals = df.select_dtypes(include=["object", "category", "bool"]).columns.tolist()
    datetimes = [c for c in df.columns if np.issubdtype(df[c].dtype, np.datetime64)]
    # Try to parse datetime-like strings
    for c in df.columns:
        if c not in datetimes and df[c].dtype == object:
            try:
                parsed = pd.to_datetime(df[c], errors="raise")
                df[c] = parsed
                datetimes.append(c)
            except Exception:
                pass

    # Sample to reduce payload
    sample_df = df.sample(min(2000, len(df)), random_state=42) if len(df) > 2000 else df.copy()

    # Histograms for numeric columns
    histograms = []
    for c in numerics[:6]:  # limit
        ser = sample_df[c].dropna()
        if len(ser) == 0:
            continue
        counts, bins = np.histogram(ser, bins=20)
        histograms.append({"column": c, "bins": bins.tolist(), "counts": counts.tolist()})

    # Bar counts for top categorical columns
    bar_counts = []
    for c in categoricals[:6]:
        vc = sample_df[c].astype(str).fillna("NaN").value_counts().head(10)
        bar_counts.append({"column": c, "labels": vc.index.tolist(), "counts": vc.values.tolist()})

    # Pie (first categorical)
    pie = None
    if categoricals:
        vc = sample_df[categoricals[0]].astype(str).fillna("NaN").value_counts().head(8)
        pie = {"column": categoricals[0], "labels": vc.index.tolist(), "values": vc.values.tolist()}

    # Correlation heatmap
    heatmap = None
    if len(numerics) >= 2:
        corr = sample_df[numerics].corr(numeric_only=True).fillna(0.0)
        heatmap = {"columns": numerics, "matrix": corr.values.round(4).tolist()}

    # Scatter of top correlated pair
    scatter = None
    if heatmap:
        corr_df = sample_df[numerics].corr(numeric_only=True).abs()
        np.fill_diagonal(corr_df.values, 0)
        try:
            yx = corr_df.unstack().sort_values(ascending=False).index[0]
            xcol, ycol = yx[0], yx[1]
            pts = sample_df[[xcol, ycol]].dropna().head(500)
            scatter = {"xCol": xcol, "yCol": ycol, "x": pts[xcol].tolist(), "y": pts[ycol].tolist()}
        except Exception:
            pass

    # Time series (first datetime + first 1-2 numeric agg mean)
    timeseries = None
    if datetimes and numerics:
        tcol = datetimes[0]
        df_ts = sample_df.dropna(subset=[tcol]).copy()
        if not df_ts.empty:
            df_ts["_d"] = pd.to_datetime(df_ts[tcol], errors="coerce")
            grp = df_ts.set_index("_d").sort_index().resample("D")[numerics[:2]].mean().dropna(how="all").head(400)
            timeseries = {
                "dateCol": tcol,
                "series": [
                    {"metric": c, "x": grp.index.strftime("%Y-%m-%d").tolist(), "y": grp[c].fillna(0).tolist()}
                    for c in grp.columns
                ],
            }

    charts["histograms"] = histograms
    charts["barCounts"] = bar_counts
    charts["pie"] = pie
    charts["heatmap"] = heatmap
    charts["scatter"] = scatter
    charts["timeseries"] = timeseries
    return charts

def generate_insights(df: pd.DataFrame, summary: Dict[str, Any], charts: Dict[str, Any]) -> List[str]:
    insights = []
    # Missingness
    miss = summary.get("missing_by_col", {})
    if miss:
        top_miss = sorted(miss.items(), key=lambda x: x[1], reverse=True)[:3]
        for c, v in top_miss:
            if v > 0:
                pct = v / summary["rows"] * 100 if summary["rows"] else 0
                insights.append(f"Column '{c}' has {v} missing values ({pct:.1f}%). Consider imputation or dropping.")
    # Correlations
    if charts.get("heatmap"):
        cols = charts["heatmap"]["columns"]
        corr = np.array(charts["heatmap"]["matrix"])
        np.fill_diagonal(corr, 0)
        if corr.size:
            idx = np.unravel_index(np.argmax(np.abs(corr)), corr.shape)
            max_val = corr[idx]
            if abs(max_val) >= 0.6:
                insights.append(f"Strong relationship detected between '{cols[idx[0]]}' and '{cols[idx[1]]}' (|r|={abs(max_val):.2f}).")
    # Dominant categories
    for b in charts.get("barCounts", [])[:2]:
        if b["labels"]:
            top_label, top_count = b["labels"][0], b["counts"][0]
            share = top_count / sum(b["counts"]) * 100 if sum(b["counts"]) else 0
            insights.append(f"In '{b['column']}', '{top_label}' is the most frequent category ({share:.1f}%).")
    # Distribution skew
    numerics = df.select_dtypes(include=[np.number]).columns
    for c in list(numerics)[:2]:
        ser = df[c].dropna()
        if len(ser) > 10:
            skew = ser.skew()
            if abs(skew) > 1:
                direction = "right-skewed" if skew > 0 else "left-skewed"
                insights.append(f"'{c}' appears {direction} (skew={skew:.2f}); consider transform or robust stats.")
    # Trend
    dt_cols = [c for c in df.columns if np.issubdtype(df[c].dtype, np.datetime64)]
    if dt_cols and len(numerics) >= 1:
        t = pd.to_datetime(df[dt_cols[0]], errors="coerce")
        ser = df[numerics[0]]
        mask = t.notna() & ser.notna()
        if mask.sum() > 5:
            # Correlation with time index
            idx = (t[mask].view("i8") - t[mask].view("i8").min()) / 1e9
            corr = np.corrcoef(idx, ser[mask])[0, 1]
            if abs(corr) > 0.2:
                sign = "increasing" if corr > 0 else "decreasing"
                insights.append(f"'{numerics[0]}' shows a mildly {sign} trend over time (r={corr:.2f}).")
    if not insights:
        insights.append("Data looks healthy. No strong trends or issues detected in the sample.")
    return insights

def generate_profile(df: pd.DataFrame, analysis_id: str) -> Optional[str]:
    if EDA_PROVIDER != "ydata":
        return None
    try:
        from ydata_profiling import ProfileReport
        report = ProfileReport(df, title="Automated EDA", minimal=True)
        out_path = PROFILE_DIR / f"{analysis_id}.html"
        report.to_file(out_path)
        return f"/static/profiles/{analysis_id}.html"
    except Exception:
        return None

def build_pdf(analysis: Dict[str, Any]) -> bytes:
    # Basic PDF with summary + small plots (hist + heatmap if present)
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm
    from reportlab.lib.utils import ImageReader
    import matplotlib.pyplot as plt

    buff = io.BytesIO()
    c = canvas.Canvas(buff, pagesize=A4)
    width, height = A4

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(2*cm, height-2*cm, "AI-Powered Data Analysis Report")
    c.setFont("Helvetica", 10)
    c.drawString(2*cm, height-2.6*cm, f"Analysis ID: {analysis['analysis_id']}  |  Rows: {analysis['summary']['rows']}  |  Columns: {analysis['summary']['columns']}")

    # Insights
    y = height - 3.4*cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2*cm, y, "Key Insights")
    y -= 0.6*cm
    c.setFont("Helvetica", 10)
    for ins in analysis["insights"][:6]:
        c.drawString(2.2*cm, y, f"- {ins}")
        y -= 0.5*cm
        if y < 4*cm:
            c.showPage(); y = height - 3*cm

    # Matplotlib images (histogram of first numeric + heatmap)
    charts = analysis["charts"]
    # Hist
    if charts.get("histograms"):
        h = charts["histograms"][0]
        plt.figure(figsize=(3.2, 2.2))
        bins = np.array(h["bins"]); counts = np.array(h["counts"])
        plt.bar((bins[:-1] + bins[1:]) / 2, counts, width=(bins[1]-bins[0])*0.8)
        plt.title(f"Histogram - {h['column']}")
        plt.tight_layout()
        img = io.BytesIO(); plt.savefig(img, format="png", dpi=150); plt.close(); img.seek(0)
        c.drawImage(ImageReader(img), 2*cm, 2*cm, width=7*cm, height=5*cm, preserveAspectRatio=True)

    # Heatmap
    if charts.get("heatmap"):
        hm = charts["heatmap"]
        plt.figure(figsize=(3.2, 2.2))
        plt.imshow(hm["matrix"], cmap="coolwarm", vmin=-1, vmax=1)
        plt.title("Correlation Heatmap")
        plt.colorbar(shrink=0.7)
        plt.xticks(range(len(hm["columns"])), hm["columns"], rotation=45, ha="right", fontsize=6)
        plt.yticks(range(len(hm["columns"])), hm["columns"], fontsize=6)
        plt.tight_layout()
        img2 = io.BytesIO(); plt.savefig(img2, format="png", dpi=150); plt.close(); img2.seek(0)
        c.drawImage(ImageReader(img2), 11*cm, 2*cm, width=7*cm, height=5*cm, preserveAspectRatio=True)

    c.showPage()
    c.save()
    buff.seek(0)
    return buff.read()

def build_excel(analysis: Dict[str, Any]) -> bytes:
    output = io.BytesIO()
    df_sample = pd.DataFrame(analysis["preview_rows"])
    summary = pd.DataFrame([analysis["summary"]]).T.rename(columns={0: "value"})
    missing = pd.DataFrame(analysis["summary"]["missing_by_col"].items(), columns=["column", "missing"])
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df_sample.to_excel(writer, index=False, sheet_name="SampleData")
        summary.to_excel(writer, sheet_name="Summary")
        missing.to_excel(writer, index=False, sheet_name="Missingness")
        # Correlations
        hm = analysis["charts"].get("heatmap")
        if hm:
            corr_df = pd.DataFrame(hm["matrix"], index=hm["columns"], columns=hm["columns"])
            corr_df.to_excel(writer, sheet_name="Correlations")
    output.seek(0)
    return output.read()

@app.get("/health")
def health():
    _cleanup_store()
    return {"status": "ok", "count": len(ANALYSES)}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(file: UploadFile = File(...)):
    df = read_dataframe(file)
    if df.empty:
        raise HTTPException(400, "No rows parsed from file.")
    summary = summarize_dataframe(df)
    cols_meta = build_columns_meta(df)
    charts = build_chart_data(df.copy())
    insights = generate_insights(df, summary, charts)
    analysis_id = str(uuid.uuid4())
    profile_url = generate_profile(df, analysis_id)

    # Small preview for UI table
    preview_rows = df.head(50).replace({np.nan: None}).to_dict(orient="records")

    ANALYSES[analysis_id] = {
        "created_at": time.time(),
        "analysis_id": analysis_id,
        "summary": summary,
        "columns": cols_meta,
        "charts": charts,
        "insights": insights,
        "preview_rows": preview_rows,
        "profile_url": profile_url,
    }

    return {
        "analysis_id": analysis_id,
        "summary": summary,
        "columns": cols_meta,
        "charts": charts,
        "insights": insights,
        "preview_rows": preview_rows,
        "profile_url": profile_url,
    }

@app.get("/analysis/{analysis_id}", response_model=AnalyzeResponse)
def get_analysis(analysis_id: str):
    _cleanup_store()
    data = ANALYSES.get(analysis_id)
    if not data:
        raise HTTPException(404, "Analysis not found or expired.")
    return data

@app.get("/download-report")
def download_report(analysis_id: str, format: str = Query("pdf", pattern="^(pdf|xlsx)$")):
    data = ANALYSES.get(analysis_id)
    if not data:
        raise HTTPException(404, "Analysis not found or expired.")
    if format == "pdf":
        content = build_pdf(data)
        return StreamingResponse(io.BytesIO(content), media_type="application/pdf",
                                 headers={"Content-Disposition": f'attachment; filename="report_{analysis_id}.pdf"'})
    else:
        content = build_excel(data)
        return StreamingResponse(io.BytesIO(content), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                 headers={"Content-Disposition": f'attachment; filename="report_{analysis_id}.xlsx"'})
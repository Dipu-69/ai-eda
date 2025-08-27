import axios from "axios";
import JSZip from "jszip";

// 1) Read API base from .env (frontend/.env)
//    Example: VITE_API_URL=https://himesh69-ai-eda.hf.space
const API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

// 2) Derive whether we should zip large CSVs
//    - Codespaces often needs zipping (tiny upload limit)
//    - Hugging Face Spaces (your current backend) does NOT support zip unless you added it in main.py
let ZIP_ALLOWED = true;
try {
  const host = API_URL ? new URL(API_URL).host : "";
  if (host.endsWith(".hf.space")) ZIP_ALLOWED = false; // disable zip for HF backend
} catch (_) {
  ZIP_ALLOWED = false;
}

if (!API_URL) {
  console.error("VITE_API_URL is not set. Create frontend/.env with VITE_API_URL=https://your-backend");
}

export const API_BASE = API_URL;

export const LIMITS = {
  RAW_MB: 3,      // Raw CSV/Excel limit (used for client-side guard)
  ZIP_MB: 20,     // Max ZIP size if zipping is enabled
  ZIP_ALLOWED,    // Whether we zip big CSVs before uploading
};

export const api = axios.create({
  baseURL: API_URL || "http://invalid", // fail clearly if not configured
  // timeout: 60000,  // optional
});

function ext(filename) {
  const m = filename?.toLowerCase?.().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

// Upload + analyze (optionally zip big CSVs)
export async function analyzeFile(file) {
  if (!API_URL) throw new Error("API base URL not set. Set VITE_API_URL in frontend/.env and restart dev server.");
  if (!file) throw new Error("No file provided");

  const e = ext(file.name);
  const isCsv = e === "csv" || e === "tsv";
  const isExcel = e === "xlsx" || e === "xls";
  const form = new FormData();

  if (LIMITS.ZIP_ALLOWED && isCsv && file.size > LIMITS.RAW_MB * 1024 * 1024) {
    // Auto-zip large CSVs (useful on Codespaces; disabled on HF)
    const zip = new JSZip();
    zip.file(file.name, file);
    const blob = await zip.generateAsync({ type: "blob" });
    if (blob.size > LIMITS.ZIP_MB * 1024 * 1024) {
      throw new Error(
        `Zipped CSV is still too large: ${(blob.size/1024/1024).toFixed(1)} MB > ${LIMITS.ZIP_MB} MB. ` +
        `Upload a smaller sample or deploy the backend with larger limits.`
      );
    }
    const zipped = new File([blob], file.name.replace(/\.\w+$/, "") + ".zip", { type: "application/zip" });
    form.append("file", zipped);
  } else if (isExcel && file.size > LIMITS.RAW_MB * 1024 * 1024) {
    // Excel is already compressed; zipping doesn't help on strict proxies
    throw new Error(
      `Excel file is too large: ${(file.size/1024/1024).toFixed(1)} MB > ${LIMITS.RAW_MB} MB. ` +
      `Upload a smaller sample or use a deployed backend.`
    );
  } else {
    // Regular upload
    form.append("file", file);
  }

  try {
    const res = await api.post("/analyze", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (e) {
    const serverText = typeof e?.response?.data === "string" ? e.response.data : null;
    const msg = e?.response?.data?.detail || serverText || e?.message || "Network error";
    throw new Error(msg);
  }
}

export async function getAnalysis(id) {
  if (!API_URL) throw new Error("API base URL not set. Set VITE_API_URL in frontend/.env and restart dev server.");
  if (!id) throw new Error("analysis_id is required");
  try {
    const res = await api.get(`/analysis/${id}`);
    return res.data;
  } catch (e) {
    const serverText = typeof e?.response?.data === "string" ? e.response.data : null;
    const msg = e?.response?.data?.detail || serverText || e?.message || "Failed to fetch analysis";
    throw new Error(msg);
  }
}

export async function downloadReportPDF(id) {
  if (!id) throw new Error("analysis_id is required");
  const res = await api.get(`/download-report`, {
    params: { analysis_id: id },   // correct param name
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
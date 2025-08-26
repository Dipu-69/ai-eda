import axios from "axios";
import JSZip from "jszip";

// Detect Codespaces backend automatically if VITE_API_URL is not set
function detectCodespacesApi() {
  const { protocol, hostname } = window.location;
  // e.g. glorious-xxx-5173.app.github.dev -> glorious-xxx-8000.app.github.dev
  const m = hostname.match(/^(.*)-\d+\.app\.github\.dev$/);
  if (m) return `${protocol}//${m[1]}-8000.app.github.dev`;
  return null;
}

const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const autoUrl = !envUrl ? detectCodespacesApi() : null;
const API_URL = (envUrl || autoUrl || "").replace(/\/$/, "");

if (!API_URL) {
  console.error("API base URL is not set. Set VITE_API_URL or rely on Codespaces auto-detection.");
}

export const API_BASE = API_URL;

export const LIMITS = {
  RAW_MB: 3,   // raw CSV/Excel limit (Codespaces-friendly)
  ZIP_MB: 20,  // zipped CSV limit
};

export const api = axios.create({
  baseURL: API_URL || "http://invalid", // fail loudly if not configured
  // timeout: 60000, // optional
});

function ext(filename) {
  const m = filename?.toLowerCase?.().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

// Upload + analyze (auto-zip big CSVs to dodge Codespaces 413)
export async function analyzeFile(file) {
  if (!file) throw new Error("No file provided");
  const e = ext(file.name);
  const isCsv = e === "csv" || e === "tsv";
  const isExcel = e === "xlsx" || e === "xls";
  const form = new FormData();

  if (isCsv && file.size > LIMITS.RAW_MB * 1024 * 1024) {
    const zip = new JSZip();
    zip.file(file.name, file);
    const blob = await zip.generateAsync({ type: "blob" });
    if (blob.size > LIMITS.ZIP_MB * 1024 * 1024) {
      throw new Error(
        `Zipped CSV is still too large: ${(blob.size/1024/1024).toFixed(1)} MB > ${LIMITS.ZIP_MB} MB. ` +
        `Upload a smaller sample or deploy the backend.`
      );
    }
    const zipped = new File([blob], file.name.replace(/\.\w+$/, "") + ".zip", { type: "application/zip" });
    form.append("file", zipped);
  } else if (isExcel && file.size > LIMITS.RAW_MB * 1024 * 1024) {
    throw new Error(
      `Excel file is too large: ${(file.size/1024/1024).toFixed(1)} MB > ${LIMITS.RAW_MB} MB. ` +
      `Use a smaller sample or a deployed backend.`
    );
  } else {
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
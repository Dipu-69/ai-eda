import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export async function analyzeFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/analyze", form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data;
}

export async function getAnalysis(id) {
  const res = await api.get(`/analysis/${id}`);
  return res.data;
}

export async function downloadReport(id, format) {
  const res = await api.get(`/download-report`, {
    params: { analysis_id: id, format },
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report_${id}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
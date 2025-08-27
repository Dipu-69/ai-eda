import { useNavigate } from "react-router-dom";
import { useState } from "react";
import FileDropzone from "../components/FileDropzone";
import { analyzeFile, LIMITS } from "../services/api";
import NavBar from "../components/NavBar";

export default function Upload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleFile(file) {
    setLoading(true); setError(null);
    try {
      const res = await analyzeFile(file);
      navigate(`/dashboard/${res.analysis_id}`, { state: res });
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <NavBar/>
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="text-2xl font-semibold mb-6">Upload a dataset</h2>
      <FileDropzone onFile={handleFile} />
      <p className="mt-3 text-xs text-gray-500">
        Size limits (Codespaces): Raw CSV/Excel up to {LIMITS.RAW_MB} MB. Larger CSV files are auto‑zipped in the browser (up to {LIMITS.ZIP_MB} MB ZIP).
      </p>
      {loading && <p className="mt-4 text-sm">Analyzing…</p>}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
    </div>
  );
}
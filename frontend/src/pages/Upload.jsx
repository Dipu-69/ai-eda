import { useNavigate } from "react-router-dom";
import { useState } from "react";
import FileDropzone from "../components/FileDropzone";
import { analyzeFile } from "../services/api";

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
      const msg = e?.response?.data?.detail || "Upload failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h2 className="text-2xl font-semibold mb-6">Upload a dataset</h2>
      <FileDropzone onFile={handleFile} />
      {loading && <p className="mt-4 text-sm">Analyzing…</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  );
}
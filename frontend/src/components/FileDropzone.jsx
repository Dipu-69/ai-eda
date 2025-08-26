import { useState } from "react";

export default function FileDropzone({ onFile }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center transition ${drag ? "border-brand-600 bg-brand-500/5" : "border-gray-300 dark:border-gray-700"}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]);
      }}
    >
      <p className="mb-4">Drag & drop CSV/Excel here or</p>
      <label className="inline-block cursor-pointer rounded bg-brand-600 text-white px-4 py-2">
        Choose file
        <input type="file" accept=".csv,.xlsx,.xls,.zip" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0]; if (f) onFile(f);
        }} />
      </label>
    </div>
  );
}
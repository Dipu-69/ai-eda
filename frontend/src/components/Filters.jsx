import { useMemo, useState } from "react";

export default function Filters({ columns, data, onFiltered }) {
  const categoricalCols = useMemo(
    () => (columns || []).filter((c) => /object|bool|category/i.test(c.dtype)),
    [columns]
  );
  const [selectedCol, setSelectedCol] = useState("");
  const [selectedVal, setSelectedVal] = useState("");

  const uniqueValues = useMemo(() => {
    if (!selectedCol) return [];
    const vals = new Set();
    (data || []).forEach((r) => vals.add(String(r[selectedCol])));
    return Array.from(vals).slice(0, 200);
  }, [data, selectedCol]);

  function apply() {
    if (!selectedCol || !selectedVal) { onFiltered(data); return; }
    onFiltered((data || []).filter((r) => String(r[selectedCol]) === selectedVal));
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs mb-1">Column</label>
        <select className="rounded border p-2 bg-white dark:bg-gray-800" value={selectedCol} onChange={(e) => setSelectedCol(e.target.value)}>
          <option value="">Select</option>
          {categoricalCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1">Value</label>
        <select className="rounded border p-2 bg-white dark:bg-gray-800" value={selectedVal} onChange={(e) => setSelectedVal(e.target.value)}>
          <option value="">Select</option>
          {uniqueValues.map((v, i) => <option key={i} value={v}>{v}</option>)}
        </select>
      </div>
      <button onClick={apply} className="rounded bg-brand-600 text-white px-4 py-2">Apply</button>
    </div>
  );
}
import { useMemo, useState } from "react";

export default function Filters({ columns, data, onFiltered }) {
  const [selectedCol, setSelectedCol] = useState("");
  const [selectedVal, setSelectedVal] = useState("");

  const categoricalCols = useMemo(
    () => (columns || []).filter((c) => /object|bool|category/i.test(c.dtype)),
    [columns]
  );

  const uniqueValues = useMemo(() => {
    if (!selectedCol) return [];
    const vals = new Set();
    (data || []).forEach((r) => vals.add(String(r[selectedCol])));
    return Array.from(vals).slice(0, 200);
  }, [data, selectedCol]);

  function apply(e) {
    e?.preventDefault?.();
    if (!selectedCol || !selectedVal) {
      onFiltered(data);
      return;
    }
    onFiltered((data || []).filter((r) => String(r[selectedCol]) === selectedVal));
  }

  function clearAll() {
    setSelectedCol("");
    setSelectedVal("");
    onFiltered(data);
  }

  return (
    <form onSubmit={apply} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <div className="col-span-2 sm:col-span-2">
        <label className="block text-xs mb-1">Column</label>
        <select
          className="w-full rounded border p-2 bg-white dark:bg-gray-800"
          value={selectedCol}
          onChange={(e) => { setSelectedCol(e.target.value); setSelectedVal(""); }}
        >
          <option value="">Select</option>
          {categoricalCols.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="col-span-2 sm:col-span-2">
        <label className="block text-xs mb-1">Value</label>
        <select
          className="w-full rounded border p-2 bg-white dark:bg-gray-800"
          value={selectedVal}
          onChange={(e) => setSelectedVal(e.target.value)}
          disabled={!selectedCol}
        >
          <option value="">Select</option>
          {uniqueValues.map((v, i) => (
            <option key={`${v}-${i}`} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div className="col-span-2 sm:col-span-1 flex gap-2">
        <button
          type="button"
          onClick={clearAll}
          className="w-1/2 sm:w-auto rounded border px-3 py-2 text-sm"
        >
          Clear
        </button>
        <button
          type="submit"
          className="w-1/2 sm:w-auto rounded bg-brand-600 text-white px-3 py-2 text-sm"
        >
          Apply
        </button>
      </div>
    </form>
  );
}
export default function SummaryCards({ summary }) {
  const items = [
    { label: "Rows", value: summary.rows },
    { label: "Columns", value: summary.columns },
    { label: "Missing (total)", value: summary.missing_total },
    { label: "Duplicate rows", value: summary.duplicate_rows },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">{it.label}</div>
          <div className="text-xl font-semibold mt-1">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
export default function InsightsPanel({ insights, profileUrl }) {
  const apiBase = import.meta.env.VITE_API_URL || "";
  return (
    <div className="rounded-xl p-4 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI Insights</h3>
        {profileUrl ? (
          <a className="text-sm text-brand-600 hover:underline" target="_blank" rel="noreferrer" href={apiBase + profileUrl}>
            Automated EDA Report
          </a>
        ) : null}
      </div>
      <ul className="mt-3 list-disc pl-6 space-y-1">
        {(insights || []).map((i, idx) => <li key={idx} className="text-sm">{i}</li>)}
      </ul>
    </div>
  );
}
// AiReportButton.jsx
import React from "react";

export default function AiReportButton({ analysisId, className = "" }) {
  const handleClick = () => {
    if (!analysisId) return alert("No analysis ID found.");
    const url = `${window.location.origin}/report/${analysisId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className={
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 " +
        className
      }
      title="Open AI Report"
    >
      AI Report
    </button>
  );
}
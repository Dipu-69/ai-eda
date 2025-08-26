export default function Footer() {
  const apiDocs = (import.meta.env.VITE_API_URL || "") + "/docs";
  return (
    <footer className="mt-16 border-t border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-semibold text-gray-900 dark:text-gray-200">AI EDA</div>
            <div>React + Tailwind + Plotly • FastAPI backend</div>
          </div>
          <nav className="flex flex-wrap gap-4">
            <a href="/" className="hover:underline">Home</a>
            <a href="/upload" className="hover:underline">Upload</a>
            <a href="#how" className="hover:underline">How it works</a>
            <a href="#features" className="hover:underline">Features</a>
            <a href="#faq" className="hover:underline">FAQ</a>
            <a href={apiDocs} target="_blank" rel="noreferrer" className="hover:underline">API Docs</a>
          </nav>
        </div>
        <div className="mt-6 text-xs text-gray-500">
          Data is processed server‑side and cached temporarily for your session. Reports are generated on demand.
        </div>
      </div>
    </footer>
  );
}
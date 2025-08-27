import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Footer() {
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const [status, setStatus] = useState({ online: false, count: 0 });

  useEffect(() => {
    let mounted = true;
    async function ping() {
      if (!apiBase) return;
      try {
        const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
        const j = await res.json();
        if (!mounted) return;
        setStatus({ online: true, count: Number(j?.count || 0) });
      } catch {
        if (!mounted) return;
        setStatus({ online: false, count: 0 });
      }
    }
    ping();
    const id = setInterval(ping, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, [apiBase]);

  return (
    <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Mobile: concise */}
        <div className="md:hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Logo size={20} withText /></div>
            <span className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.online ? "bg-emerald-500" : "bg-red-500"}`} />
              {status.online ? "Online" : "Offline"}
            </span>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/features" className="hover:underline">Features</Link>
            <Link to="/upload" className="hover:underline">Upload</Link>
            <Link to="/api" className="hover:underline">API</Link>
          </nav>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} AI EDA.
          </p>
          <p className="text-xs text-gray-500">
            Made by <span className="font-medium">Himesh</span>
          </p>
        </div>

        {/* Desktop: keep full footer */}
        <div className="hidden md:grid gap-8 grid-cols-1 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2"><Logo size={22} withText /></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Automated EDA, interactive charts, AI insights, and a quick forecast when a date + target are present.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <Badge>CSV/Excel</Badge><Badge>Interactive Charts</Badge><Badge>AI Insights</Badge><Badge>Forecast</Badge><Badge>Light/Dark</Badge>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/" className="hover:underline">Home</Link></li>
              <li><Link to="/features" className="hover:underline">Features</Link></li>
              <li><Link to="/upload" className="hover:underline">Upload</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {apiBase ? (
                <>
                  <li><a href={`${apiBase}/docs`} className="hover:underline" target="_blank" rel="noreferrer">API Docs</a></li>
                  <li><a href={`${apiBase}/health`} className="hover:underline" target="_blank" rel="noreferrer">Health endpoint</a></li>
                </>
              ) : <li className="text-gray-500">Set VITE_API_URL</li>}
              <li className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.online ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-gray-500">
                  {status.online ? `Backend online • ${status.count} active analyses` : "Backend offline"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Desktop-only attribution line */}
        <div className="hidden md:block mt-6 text-xs text-gray-500">
          Made by <span className="font-medium">Himesh</span>
        </div>
      </div>
    </footer>
  );
}

function Badge({ children }) {
  return <span className="rounded-full border border-gray-300/70 dark:border-gray-700 px-2.5 py-0.5">{children}</span>;
}
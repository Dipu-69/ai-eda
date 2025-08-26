import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Footer() {
  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  const [status, setStatus] = useState({ online: false, count: 0, err: null });

  useEffect(() => {
    let mounted = true;
    async function ping() {
      if (!apiBase) { setStatus({ online: false, count: 0, err: "Set VITE_API_URL" }); return; }
      try {
        const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
        const j = await res.json();
        if (!mounted) return;
        setStatus({ online: true, count: Number(j?.count || 0), err: null });
      } catch (e) {
        if (!mounted) return;
        setStatus({ online: false, count: 0, err: "Offline" });
      }
    }
    ping();
    const id = setInterval(ping, 15000); // refresh every 15s
    return () => { mounted = false; clearInterval(id); };
  }, [apiBase]);

  return (
    <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Logo size={22} withText />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Automated EDA, interactive charts, AI insights, and a quick time‑series forecast when a date + target are present.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <Badge>CSV/Excel</Badge>
              <Badge>Interactive Charts</Badge>
              <Badge>AI Insights</Badge>
              <Badge>Forecast</Badge>
              <Badge>Light/Dark</Badge>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/" className="hover:underline">Home</Link></li>
              <li><Link to="/features" className="hover:underline">Features</Link></li>
              <li><Link to="/upload" className="hover:underline">Upload</Link></li>
            </ul>
          </div>

          {/* Resources / Status */}
          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                {apiBase ? (
                  <a href={`${apiBase}/docs`} target="_blank" rel="noreferrer" className="hover:underline">
                    API Docs
                  </a>
                ) : (
                  <span className="text-gray-500">Set VITE_API_URL for API Docs</span>
                )}
              </li>
              <li>
                {apiBase ? (
                  <a href={`${apiBase}/health`} target="_blank" rel="noreferrer" className="hover:underline">
                    Health endpoint
                  </a>
                ) : null}
              </li>
              <li className="flex items-center gap-2">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.online ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {status.online ? `Backend online • ${status.count} active analyses` : (status.err || "Offline")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-gray-500">
          <div>© {new Date().getFullYear()} AI EDA. All rights reserved.</div>
          <div className="flex flex-wrap gap-4">
            <span>Data is processed server‑side and cached temporarily for your session.</span>
            {/* Add your own links if you publish policies */}
            {/* <a href="/privacy" className="hover:underline">Privacy</a>
            <a href="/terms" className="hover:underline">Terms</a> */}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full border border-gray-300/70 dark:border-gray-700 px-2.5 py-0.5">
      {children}
    </span>
  );
}
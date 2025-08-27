import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);

  const navLinkClass = ({ isActive }) =>
    `text-sm hover:text-gray-900 dark:hover:text-white ${
      isActive ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-gray-300"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur border-b border-gray-200/70 dark:border-gray-800">
      <div className="mx-auto max-w-6xl px-4">
        <div className="h-14 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" aria-label="QueryLens home" className="select-none">
            <Logo size={24} withText />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5">
            <NavLink to="/features" className={navLinkClass}>
              Features
            </NavLink>

            {/* Always route to internal API docs page */}
            <NavLink to="/api" className={navLinkClass}>
              API Docs
            </NavLink>

            <NavLink to="/upload" className={navLinkClass}>
              Upload
            </NavLink>

            <ThemeToggle />
          </nav>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" className="text-gray-700 dark:text-gray-200">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  d={open ? "M6 6l12 12M18 6L6 18" : "M3 6h18M3 12h18M3 18h18"}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-200/70 dark:border-gray-800">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-1">
            <NavLink
              to="/features"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Features
            </NavLink>

            <NavLink
              to="/api"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              API Docs
            </NavLink>

            <NavLink
              to="/upload"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Upload
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const ls = localStorage.getItem("theme");
    if (ls) return ls === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
    >
      {dark ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-yellow-300">
            <path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v1.2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7 8h1.2a1 1 0 1 1 0 2H19a1 1 0 1 1 0-2ZM4 11H2.8a1 1 0 1 0 0 2H4a1 1 0 0 0 0-2Zm1.6-6.4a1 1 0 0 1 1.4 0l.85.85a1 1 0 1 1-1.41 1.41l-.85-.85a1 1 0 0 1 0-1.41Zm10.2 0 .85.85a1 1 0 1 0 1.41-1.41l-.85-.85a1 1 0 0 0-1.41 1.41ZM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm6.4 10.4a1 1 0 0 0-1.4 0l-.85.85a1 1 0 1 0 1.41 1.41l.85-.85a1 1 0 0 0 0-1.41ZM6.25 17.25l-.85.85a1 1 0 1 0 1.41 1.41l.85-.85a1 1 0 1 0-1.41-1.41ZM12 18.8a1 1 0 1 0-2 0V20a1 1 0 1 0 2 0v-1.2Z"/>
          </svg>
          Dark
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-700 dark:text-gray-200">
            <path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/>
          </svg>
          Light
        </>
      )}
    </button>
  );
}
import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import DarkModeToggle from "./components/DarkModeToggle";

export default function App() {
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100">
      <nav className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-gray-900/60 border-b border-gray-200/50 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-brand-600">AI EDA</Link>
          <div className="flex items-center gap-4">
            <Link to="/upload" className="text-sm hover:underline">Upload</Link>
            <DarkModeToggle />
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/dashboard/:id" element={<Dashboard />} />
      </Routes>
    </div>
  );
}
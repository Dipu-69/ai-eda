import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);
  return (
    <button onClick={() => setDark(!dark)} className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700">
      {dark ? "Light" : "Dark"}
    </button>
  );
}
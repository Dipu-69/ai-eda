import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-500/10 via-fuchsia-400/10 to-emerald-400/10" />
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight"
        >
          Upload Your Data → Get Instant Insights
        </motion.h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
          A mini-Tableau powered by automated EDA and AI-generated insights.
        </p>
        <div className="mt-10">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 text-white px-6 py-3 hover:brightness-110 transition"
          >
            Upload CSV/Excel
          </Link>
        </div>
      </div>
    </section>
  );
}
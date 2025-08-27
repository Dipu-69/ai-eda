import { Routes, Route, Link } from "react-router-dom";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import Footer from "./components/Footer";
import Features from "./pages/Features";
import ApiDocs from "./pages/ApiDocs";
import AppLayout from "./layouts/AppLayout";
import ReportPage from "./pages/ReportPage";


export default function App() {
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 flex flex-col">
      

      <div className="flex-1">
        <Routes element={<AppLayout />}>
          <Route path="/" element={<Landing />} />
            
           <Route path="/features" element={<Features />} />   {/* NEW */}
           <Route path="/api" element={<ApiDocs />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/report/:analysisId" element={<ReportPage />} />
          <Route path="/dashboard/:id" element={<Dashboard />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}
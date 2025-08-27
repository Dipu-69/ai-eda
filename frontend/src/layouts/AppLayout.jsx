// src/layouts/AppLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

export default function AppLayout() {
  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 flex flex-col">
      <NavBar />               {/* always visible */}
      <main className="flex-1">
        <Outlet />             {/* each page renders here */}
      </main>
      <Footer />
    </div>
  );
}
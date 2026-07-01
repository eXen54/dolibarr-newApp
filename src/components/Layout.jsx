import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { FO_Navbar, BO_Navbar } from "../components/Navbar";

export const FO_Layout = () => {
  return (
    <div className="min-h-screen app-shell text-slate-700">
      <FO_Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
};

export const BO_Layout = () => {
  const isAdmin = localStorage.getItem("admin_session") === "true";

  if (!isAdmin) {
    return <Navigate to="/bo" replace />;
  }

  return (
    <div className="min-h-screen app-shell text-slate-700">
      <BO_Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
};

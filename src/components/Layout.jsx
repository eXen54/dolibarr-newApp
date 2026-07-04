import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { FO_Navbar, BO_Navbar } from "../components/Navbar";

// Disposition avec sidebar à gauche + contenu qui remplit le reste.
export const FO_Layout = () => {
  return (
    <div className="flex min-h-screen app-shell text-slate-700">
      <FO_Navbar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
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
    <div className="flex min-h-screen app-shell text-slate-700">
      <BO_Navbar />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

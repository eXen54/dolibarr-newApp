import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import {
  Wallet,
  Plus,
  Zap,
  Users,
  LayoutDashboard,
  LogOut,
  FileUp,
  RefreshCcw,
  Box,
  Palette,
  CalendarDays,
} from "lucide-react";

const NavLink = ({ to, icon: Icon, children, activeClass, exact = false }) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ${
        isActive
          ? activeClass
          : "text-slate-500 hover:bg-white/80 hover:text-slate-900"
      }`}
    >
      <Icon size={18} />
      {children}
    </Link>
  );
};

export const FO_Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/70 p-4 backdrop-blur-2xl shadow-[0_12px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-soft transition-transform group-hover:scale-105">
              <Box size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">
              NewAPP
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <NavLink
              to="/fo/salaires"
              icon={Wallet}
              exact
              activeClass="bg-blue-600 text-white shadow-soft"
            >
              Salaires
            </NavLink>
            <NavLink
              to="/fo/salaires/nouveau"
              icon={Plus}
              activeClass="bg-blue-600 text-white shadow-soft"
            >
              Nouveau
            </NavLink>
            <NavLink
              to="/fo/generer"
              icon={Zap}
              activeClass="bg-blue-600 text-white shadow-soft"
            >
              Génération
            </NavLink>
            <NavLink
              to="/fo/employes"
              icon={Users}
              activeClass="bg-blue-600 text-white shadow-soft"
            >
              Salariés
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </nav>
  );
};

export const BO_Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/70 p-4 backdrop-blur-2xl shadow-[0_12px_40px_-28px_rgba(15,23,42,0.45)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <Link to="/bo/dashboard" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-soft transition-transform group-hover:scale-105">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900">
              Admin
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-1">
            <NavLink
              to="/bo/dashboard"
              icon={LayoutDashboard}
              activeClass="bg-slate-900 text-white shadow-soft"
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/bo/import"
              icon={FileUp}
              activeClass="bg-slate-900 text-white shadow-soft"
            >
              Importation
            </NavLink>
            <NavLink
              to="/bo/jours-feries"
              icon={CalendarDays}
              activeClass="bg-slate-900 text-white shadow-soft"
            >
              Jours fériés
            </NavLink>
            <NavLink
              to="/bo/theme"
              icon={Palette}
              activeClass="bg-slate-900 text-white shadow-soft"
            >
              Thème
            </NavLink>
            <NavLink
              to="/bo/reset"
              icon={RefreshCcw}
              activeClass="bg-slate-900 text-white shadow-soft"
            >
              Reset
            </NavLink>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-red-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-600 hover:text-white active:scale-[0.98]"
          >
            <LogOut size={16} />
            Session
          </button>
        </div>
      </div>
    </nav>
  );
};

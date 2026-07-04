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
  Home,
} from "lucide-react";

// Lien de la sidebar : ligne pleine largeur (icône + libellé).
const NavLink = ({ to, icon: Icon, children, activeClass, exact = false }) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ${
        isActive
          ? activeClass
          : "text-slate-500 hover:bg-white/80 hover:text-slate-900"
      }`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="hidden lg:inline">{children}</span>
    </Link>
  );
};

// Coquille commune de la sidebar (largeur, position, colonne verticale).
const Shell = ({ children }) => (
  <aside className="sticky top-0 z-40 flex h-screen w-20 shrink-0 flex-col border-r border-white/60 bg-white/70 p-3 backdrop-blur-2xl shadow-[12px_0_40px_-28px_rgba(15,23,42,0.45)] lg:w-64 lg:p-4">
    {children}
  </aside>
);

export const FO_Navbar = () => {
  return (
    <Shell>
      <Link to="/" className="group mb-6 flex items-center gap-3 px-2 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-soft transition-transform group-hover:scale-105">
          <Box size={20} />
        </div>
        <span className="hidden text-xl font-black tracking-tighter text-slate-900 lg:inline">
          NewAPP
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        <NavLink to="/fo/salaires" icon={Wallet} exact activeClass="bg-blue-600 text-white shadow-soft">
          Salaires
        </NavLink>
        <NavLink to="/fo/salaires/nouveau" icon={Plus} activeClass="bg-blue-600 text-white shadow-soft">
          Nouveau
        </NavLink>
        <NavLink to="/fo/generer" icon={Zap} activeClass="bg-blue-600 text-white shadow-soft">
          Génération
        </NavLink>
        <NavLink to="/fo/employes" icon={Users} activeClass="bg-blue-600 text-white shadow-soft">
          Salariés
        </NavLink>
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-200/60 pt-4">
        <ThemeToggle />
        <Link
          to="/"
          className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/80 hover:text-slate-900"
        >
          <Home size={18} className="shrink-0" />
          <span className="hidden lg:inline">Accueil</span>
        </Link>
      </div>
    </Shell>
  );
};

export const BO_Navbar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    navigate("/");
  };

  return (
    <Shell>
      <Link to="/bo/dashboard" className="group mb-6 flex items-center gap-3 px-2 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-soft transition-transform group-hover:scale-105">
          <LayoutDashboard size={20} />
        </div>
        <span className="hidden text-xl font-black tracking-tighter text-slate-900 lg:inline">
          Admin
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        <NavLink to="/bo/dashboard" icon={LayoutDashboard} activeClass="bg-slate-900 text-white shadow-soft">
          Dashboard
        </NavLink>
        <NavLink to="/bo/import" icon={FileUp} activeClass="bg-slate-900 text-white shadow-soft">
          Importation
        </NavLink>
        <NavLink to="/bo/jours-feries" icon={CalendarDays} activeClass="bg-slate-900 text-white shadow-soft">
          Jours fériés
        </NavLink>
        <NavLink to="/bo/theme" icon={Palette} activeClass="bg-slate-900 text-white shadow-soft">
          Thème
        </NavLink>
        <NavLink to="/bo/reset" icon={RefreshCcw} activeClass="bg-slate-900 text-white shadow-soft">
          Reset
        </NavLink>
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-200/60 pt-4">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-[0.98]"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="hidden lg:inline">Déconnexion</span>
        </button>
      </div>
    </Shell>
  );
};

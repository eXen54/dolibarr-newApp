import React from "react";
import { Link } from "react-router-dom";
import { Monitor, ShieldCheck, ArrowRight, Box, Zap } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

export default function StartPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 selection:bg-slate-900 selection:text-white">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="max-w-6xl w-full">
        <div className="flex flex-col items-center text-center mb-24 animate-slide-up">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-slate-200">
            <Zap size={24} />
          </div>
          <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter">
            NewAPP <span className="text-slate-400">/</span> Dolibarr
          </h1>
          <p className="text-xl text-slate-500 max-w-xl font-medium leading-relaxed">
            Application connectée à Dolibarr pour la gestion des salaires et des
            règlements des employés.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          <Link
            to="/fo"
            className="group bg-white p-12 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mb-10 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6">
              <Monitor size={36} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
              FrontOffice
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Accès aux données Dolibarr de manière simple et intuitive.
            </p>
            <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-widest text-xs">
              Accéder à l'espace
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>

          <Link
            to="/bo"
            className="group bg-slate-900 p-12 rounded-[40px] shadow-2xl shadow-slate-200 hover:shadow-black/20 hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center text-white"
          >
            <div className="w-20 h-20 bg-slate-800 text-white rounded-[28px] flex items-center justify-center mb-10 group-hover:bg-white group-hover:text-slate-900 transition-all duration-500 group-hover:-rotate-6">
              <ShieldCheck size={36} />
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tight text-white">
              BackOffice
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed mb-8">
              Administration, importation de données et paramétrage de
              l'application.
            </p>
            <div className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs">
              Espace sécurisé
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </div>
          </Link>
        </div>

        <footer className="mt-32 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
            &copy; 2026 NEWAPP Dolibarr
          </p>
        </footer>
      </div>
    </div>
  );
}

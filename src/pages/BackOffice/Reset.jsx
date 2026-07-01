import React, { useState } from "react";
import {
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { resetData } from "../../services/backoffice/dolibarr.js";

export default function Reset() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);

  const handleReset = async () => {
    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer TOUTES les données (employés, salaires, règlements, jours fériés) ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: 0 });
    try {
      const res = await resetData((p) => setProgress(p));
      setResult(res);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setProgress({ current: 0, total: 0 });
      }, 5000);
    } catch (err) {
      console.error(err);
      alert(
        "Erreur lors de la réinitialisation : " +
          (err.message || "Erreur inconnue"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100 text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm rotate-3 group hover:rotate-0 transition-transform duration-500">
            <ShieldAlert size={48} />
          </div>

          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
            Zone de danger
          </h1>
          <p className="text-slate-500 mb-10 leading-relaxed max-w-md mx-auto">
            La réinitialisation supprime définitivement toutes les données :
            règlements, fiches de salaire, employés et jours fériés. Cette action
            est irréversible.
          </p>

          {loading && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <Trash2 size={14} className="text-red-500" />
                  Suppression en cours...
                </span>
                {progress.total > 0 && (
                  <span className="text-sm font-bold text-slate-600">
                    {progress.current} / {progress.total}
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{
                    width: progress.total
                      ? `${(progress.current / progress.total) * 100}%`
                      : "100%",
                  }}
                ></div>
              </div>
            </div>
          )}

          {!done ? (
            <button
              onClick={handleReset}
              disabled={loading}
              className={`flex items-center gap-3 px-10 py-5 rounded-[24px] font-bold text-white mx-auto transition-all shadow-xl ${
                loading
                  ? "bg-slate-300 cursor-not-allowed shadow-none"
                  : "bg-red-600 hover:bg-red-700 hover:-translate-y-1 shadow-red-100"
              }`}
            >
              <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
              {loading ? "Réinitialisation en cours..." : "Réinitialiser"}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 text-green-600 animate-fade-in">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle size={32} />
              </div>
              <p className="font-black text-xl tracking-tight">
                Données réinitialisées
              </p>
              {result && (
                <p className="text-sm font-semibold text-slate-500">
                  {result.deleted} / {result.total} élément(s) supprimé(s)
                  {result.failed > 0 && (
                    <span className="text-red-500">
                      {" "}
                      — {result.failed} échec(s)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-red-50/30 rounded-full"></div>
      </div>
    </div>
  );
}

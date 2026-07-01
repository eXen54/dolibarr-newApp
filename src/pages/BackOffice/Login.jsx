import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, Lock, Command } from "lucide-react";

export default function Login() {
  const [code, setCode] = useState("ADMIN2026");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (code === "ADMIN2026") {
      localStorage.setItem("admin_session", "true");
      navigate("/bo/dashboard");
    } else {
      alert("Code invalide");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="max-w-md w-full animate-fade-in">
        <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3">
                <ShieldCheck size={40} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                Accès Administration
              </h1>
              <p className="text-slate-500 font-medium">
                Saisissez votre code pour continuer
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Command size={20} />
                  </div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-mono text-center tracking-widest text-lg font-bold text-slate-900"
                    placeholder="CODE-ACCES"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="group w-full bg-slate-900 text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-200"
              >
                Déverrouiller
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-50 text-center">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <Lock size={12} />
                Système Sécurisé
              </p>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-slate-50 rounded-full opacity-50"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-slate-50 rounded-full opacity-50"></div>
        </div>
      </div>
    </div>
  );
}

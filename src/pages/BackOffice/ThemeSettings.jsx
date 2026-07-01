import React, { useState, useEffect } from "react";
import { Palette, Sun, Moon, Settings, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { THEMES, THEME_LABELS, getTheme, applyTheme } from "../../theme";

export default function ThemeSettings() {
  const [currentTheme, setCurrentTheme] = useState(getTheme());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch saved theme from backend on mount
  useEffect(() => {
    const fetchSavedTheme = async () => {
      try {
        const response = await axios.get("/api/theme");
        if (response.data && response.data.theme) {
          setCurrentTheme(response.data.theme);
          applyTheme(response.data.theme);
        }
      } catch (error) {
        console.warn("Erreur lors de la récupération du thème:", error);
      }
    };
    fetchSavedTheme();
  }, []);

  const themeOptions = [
    { id: "light", label: "Clair", icon: Sun, color: "bg-slate-100" },
    { id: "dark", label: "Sombre", icon: Moon, color: "bg-slate-900" },
    { id: "dolibarr", label: "Dolibarr", icon: Palette, color: "bg-blue-600" },
  ];

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put("/api/theme", {
        theme: currentTheme,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du thème:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
          Paramètres du thème
        </h1>
        <p className="text-slate-500">
          Personnalisez l'apparence de l'application
        </p>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
            <Palette size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Choisir un thème
            </h2>
            <p className="text-slate-500">
              Le thème est sauvegardé dans la base de données SQLite
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = currentTheme === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleThemeChange(option.id)}
                className={`p-8 rounded-[28px] border-2 transition-all flex flex-col items-center gap-4 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl ${option.color} flex items-center justify-center text-white`}
                >
                  <Icon size={32} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-slate-900">
                    {option.label}
                  </p>
                  {isSelected && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-blue-600 font-bold text-sm">
                      <CheckCircle2 size={16} />
                      Sélectionné
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-4">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 font-bold">
              <CheckCircle2 size={20} />
              Thème sauvegardé !
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Settings size={20} className={saving ? "animate-spin" : ""} />
            {saving ? "Sauvegarde en cours..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

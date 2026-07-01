import React, { useState } from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { getTheme, applyTheme, nextTheme, THEME_LABELS } from "../theme";

const ICONS = {
  light: Sun,
  dark: Moon,
  dolibarr: Palette,
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getTheme());

  const handleClick = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
  };

  const Icon = ICONS[theme];

  return (
    <button
      onClick={handleClick}
      title={`Thème : ${THEME_LABELS[theme]} — cliquer pour changer`}
      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-900 active:scale-[0.98]"
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
    </button>
  );
}

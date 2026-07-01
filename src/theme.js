// Gestion du thème de l'application.
export const THEMES = ["light", "dark", "dolibarr"];

export const THEME_LABELS = {
  light: "Clair",
  dark: "Sombre",
  dolibarr: "Dolibarr",
};

// Lit le thème enregistré
export const getTheme = () => {
  const saved = localStorage.getItem("theme");
  return THEMES.includes(saved) ? saved : "light";
};

// Applique un thème
export const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
};

// Renvoie le thème suivant
export const nextTheme = (theme) => {
  const index = THEMES.indexOf(theme);
  return THEMES[(index + 1) % THEMES.length];
};

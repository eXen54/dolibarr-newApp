// Petits utilitaires de formatage / calcul, partagés par les pages.

// Devise utilisée pour l'affichage (modifiable facilement).
export const CURRENCY = "Ar";

// Les dates de l'API Dolibarr sont des timestamps Unix (secondes).
export const dateFromTs = (ts) => {
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000) : null;
};

export const fmtDate = (ts) => {
  const d = dateFromTs(ts);
  return d ? d.toLocaleDateString("fr-FR") : "—";
};

export const fmtMoney = (n) =>
  `${Number(n || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${CURRENCY}`;

// Version courte (sans décimales) pour les libellés de graphiques.
export const fmtMoneyShort = (n) =>
  `${Math.round(Number(n || 0)).toLocaleString("fr-FR")} ${CURRENCY}`;

// "mars 26" (libellé court pour l'axe des mois)
export const monthShort = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return `${d.toLocaleDateString("fr-FR", { month: "short" })} ${y.slice(2)}`;
};

// "2026-03"
export const monthKey = (ts) => {
  const d = dateFromTs(ts);
  if (!d) return "?";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// "mars 2026"
export const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

export const genderLabel = (g) =>
  g === "man" ? "Homme" : g === "woman" ? "Femme" : "—";

// --- Dates par défaut (format 'YYYY-MM-DD' pour les <input type="date">) ---
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
export const todayISO = () => iso(new Date());
export const monthStart = () => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
};
export const monthEnd = () => {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

// Somme des règlements d'un salaire donné.
export const paidForSalary = (payments, salaryId) =>
  payments
    .filter((p) => Number(p.fk_salary) === Number(salaryId))
    .reduce((s, p) => s + Number(p.amount || 0), 0);

// URL de la photo d'un employé (servie par notre API, via le serveur Vite).
export const photoUrl = (employee) =>
  employee?.photo ? `/api/photo/${employee.id}` : null;

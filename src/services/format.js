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

export const joursDuMois = (year, month) => {
  const nbJours = new Date(year, month, 0).getDate();
  const jours = [];
  for (let d = 1; d <= nbJours; d++) {
    jours.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  return jours;
};
// Un timestamp Dolibarr (secondes) -> numéro de jour civil, robuste au décalage
// de fuseau du serveur Dolibarr (qui peut renvoyer 23:00 la veille au lieu de
// minuit). On arrondit au jour le plus proche avant de compter les jours.
const jourNumero = (ts) => Math.round(Number(ts) / 86400);

export const salaireCouvreJour = (salaire, jourISO) => {
  const [y, m, d] = jourISO.split("-").map(Number);
  const jour = jourNumero(Math.floor(Date.UTC(y, m - 1, d) / 1000));
  const debut = Number(salaire.datesp);
  const fin = Number(salaire.dateep);
  if (!debut || !fin) {
    return false;
  }
  // Le jour de fin d'un salaire existant est couvert : la complétion reprend
  // le lendemain (borne inclusive).
  return jour >= jourNumero(debut) && jour <= jourNumero(fin);
};
export const segmentsManquants = (year, month, salairesEmploye) => {
  const jours = joursDuMois(year, month);
  const manquants = jours.filter(
    (j) => !salairesEmploye.some((s) => salaireCouvreJour(s, j)),
  );

  const segments = [];
  let courant = null;
  for (const j of manquants) {
    if (courant && new Date(j) - new Date(courant.fin) === 86400000) {
      courant.fin = j;
      courant.jours.push(j);
    } else {
      courant = { debut: j, fin: j, jours: [j] };
      segments.push(courant);
    }
  }
  return segments;
};
export const montantSegment = (
  segment,
  tarifJour,
  pourcentageMajoration,
  joursFeriesISO,
) => {
  const feries = new Set(joursFeriesISO);
  let montant = 0;
  for (const j of segment.jours) {
    montant += feries.has(j)
      ? tarifJour * (1 + Number(pourcentageMajoration || 0) / 100)
      : tarifJour;
  }
  return Math.round(montant * 100) / 100;
};

// URL de la photo d'un employé (servie par notre API, via le serveur Vite).
export const photoUrl = (employee) =>
  employee?.photo ? `/api/photo/${employee.id}` : null;

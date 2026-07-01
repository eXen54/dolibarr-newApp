import api from "../dolibarr.js";

// =============================================================================
// Service Dolibarr — domaine SALAIRES
//   - Employés   -> utilisateurs Dolibarr (API /users)
//   - Salaires   -> fiches de salaire     (API /salaries)
//   - Règlements -> paiements de salaire   (API /salaries/{id}/payments)
// Utilisé par le BackOffice ET le FrontOffice.
// =============================================================================

// L'API Dolibarr renvoie AU PLUS 100 éléments par requête. On pagine donc
// par tranches de 100 jusqu'à tout récupérer.
const PAGE_SIZE = 100;

const parseTotalFromContentRange = (value) => {
  // Format attendu : "0-99/120"
  const m = String(value || "").match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
};

// L'API Dolibarr attend des timestamps Unix (secondes) pour les champs date.
const toTimestamp = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (/^\d+$/.test(String(value).trim())) return Number(value);
  const ts = Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(ts) ? ts : undefined;
};

// "08/03/26" ou "01/03/2026" (jj/mm/aa) -> timestamp Unix (secondes).
const parseFrDate = (value) => {
  if (!value) return undefined;
  const [d, m, y] = String(value).trim().split("/");
  if (!d || !m || !y) return toTimestamp(value);
  let year = Number(y);
  if (year < 100) year += 2000; // 26 -> 2026
  return Math.floor(Date.UTC(year, Number(m) - 1, Number(d)) / 1000);
};

// "677,56" -> 677.56  |  "890" -> 890
const parseMontant = (value) => {
  const n = parseFloat(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};

// Colonne "paiement" : {["08/03/26",480],["08/03/26",300]} -> [{date, montant}, ...]
// Remarque : parseCSV retire les guillemets internes ; on reçoit donc plutôt
// {[08/03/26,890],[08/03/26,300]}. Le regex gère les deux formes (guillemets
// optionnels). La date (jj/mm/aa) contient des "/", le montant des chiffres.
const parsePaiements = (value) => {
  const out = [];
  const re = /\[\s*"?([0-9/]+)"?\s*,\s*"?([0-9.,]+)"?\s*\]/g;
  let match;
  while ((match = re.exec(String(value ?? ""))) !== null) {
    out.push({ date: parseFrDate(match[1]), montant: parseMontant(match[2]) });
  }
  return out;
};

/** GET paginé sur l'API Dolibarr. */
const getAllPaged = async (endpoint, extraParams = {}) => {
  const all = [];
  const MAX_PAGES = 50;
  const seenIds = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    let data;
    let headers;
    try {
      const r = await api.get(endpoint, {
        params: {
          sortfield: "t.rowid",
          sortorder: "ASC",
          limit: PAGE_SIZE,
          page,
          ...extraParams,
        },
      });
      data = r.data;
      headers = r.headers;
    } catch (err) {
      if (page === 0) {
        // 404 = liste vide côté Dolibarr : on renvoie [] sans planter.
        if (err.response?.status === 404) return [];
        throw err;
      }
      break;
    }

    const items = Array.isArray(data) ? data : (data?.data ?? []);
    if (items.length === 0) break;

    let added = 0;
    for (const item of items) {
      const id = typeof item === "object" ? (item?.id ?? item?.rowid) : null;
      if (id != null) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      all.push(item);
      added++;
    }

    if (added === 0 || items.length < PAGE_SIZE) break;
    const total = parseTotalFromContentRange(headers?.["content-range"]);
    if (Number.isFinite(total) && all.length >= total) break;
  }

  return all;
};

// --- Lecture CSV simple (gère les guillemets) ---
const parseCSV = (text) => {
  const lines = text.trim().split("\n").map((l) => l.replace(/\r$/, ""));
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  return lines.slice(1).filter((l) => l.trim() !== "").map((line) => {
    const fields = [];
    let current = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuote = !inQuote;
      else if (ch === "," && !inQuote) {
        fields.push(current.trim());
        current = "";
      } else current += ch;
    }
    fields.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = fields[i] ?? ""));
    return obj;
  });
};

const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });

const readFileBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target.result).split(",")[1]); // retire "data:...;base64,"
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// =============================================================================
// EMPLOYÉS  (utilisateurs Dolibarr)
// =============================================================================

// On ne garde que les "employés" et on exclut l'admin (id 1).
export const getEmployees = async () => {
  try {
    const users = await getAllPaged("users");
    return users.filter((u) => Number(u.employee) === 1 && Number(u.id) !== 1);
  } catch (err) {
    console.warn("getEmployees:", err.message);
    return [];
  }
};

export const createEmployee = async (row) => {
  const genre = String(row.genre ?? "").toLowerCase();
  const payload = {
    login: row.identifiant ?? row.login,
    lastname: row.nom ?? row.lastname,
    gender: genre.startsWith("h") ? "man" : "woman", // homme/femme -> man/woman
    employee: 1,
  };
  // Poste -> champ Dolibarr "job" ; heures/semaine -> "weeklyhours" (gère "37,5").
  if (row.poste) payload.job = row.poste;
  const heures = row.heure_travail_semaine ?? row.weeklyhours;
  if (heures) payload.weeklyhours = parseMontant(heures);
  // Dolibarr impose un mot de passe d'au moins 12 caractères : un mdp trop court
  // fait échouer la création (HTTP 500). On ne l'envoie que s'il est valide ;
  // sinon Dolibarr en génère un automatiquement et l'employé est bien créé.
  const pass = row.mdp ?? row.password;
  if (pass && String(pass).length >= 12) payload.pass = pass;
  const res = await api.post("users", payload);
  return typeof res.data === "object" ? (res.data.id ?? res.data) : res.data;
};

export const deleteEmployee = (id) => api.delete(`users/${id}`).then(() => true);

// =============================================================================
// SALAIRES
// =============================================================================

export const getSalaries = () => getAllPaged("salaries");

export const getSalary = (id) => api.get(`salaries/${id}`).then((r) => r.data);

export const createSalary = async (data) => {
  const res = await api.post("salaries", data);
  return typeof res.data === "object" ? (res.data.id ?? res.data) : res.data;
};

export const deleteSalary = (id) =>
  api.delete(`salaries/${id}`).then(() => true);

// =============================================================================
// RÈGLEMENTS  (paiements de salaire)
// =============================================================================

export const getPayments = () => getAllPaged("salaries/payments");

// type : id du mode de règlement (4 = espèces par défaut).
// NB : le module Banque de Dolibarr doit être désactivé (sinon l'API exige un
// compte bancaire et la suppression d'un règlement échoue).
export const addPayment = async (salaryId, { montant, date, type = 4 }) => {
  const r = await api.post(`salaries/${salaryId}/payments`, {
    chid: Number(salaryId),
    datepaye: toTimestamp(date),
    paiementtype: type, // champ obligatoire côté API
    fk_typepayment: type, // champ réellement utilisé à la création
    amounts: { [salaryId]: montant },
  });
  return r.data;
};

export const deletePayment = (id) =>
  api.delete(`salaries/${id}/payments`).then(() => true);

// =============================================================================
// IMPORT  (Employés CSV + Salaires CSV + Photos ZIP)
// =============================================================================

const isAlreadyExists = (err) => {
  const blob = JSON.stringify(err.response?.data ?? err.message ?? "");
  return /AlreadyExists|already exists|existe déjà|Duplicate/i.test(blob);
};

export const importAll = async (
  { employeesFile, salariesFile, photosZip },
  onProgress = () => {},
) => {
  const summary = { created: 0, skipped: 0, failed: 0, errors: [], photos: 0 };
  const refToUserId = {}; // ref_employe -> id utilisateur Dolibarr
  const refToName = {}; // ref_employe -> nom (pour le libellé du salaire)

  // ---- 1) Employés ----
  if (employeesFile) {
    const rows = parseCSV(await readFileText(employeesFile));
    // On lit d'abord les employés déjà présents : un login existant fait échouer
    // le POST (HTTP 500 "Login already exists"). On évite donc de le recréer.
    const existing = await getEmployees();
    const loginToId = {};
    existing.forEach((e) => (loginToId[e.login] = e.id));

    for (let i = 0; i < rows.length; i++) {
      onProgress({ step: "Import des employés", current: i + 1, total: rows.length });
      refToName[rows[i].ref_employe] = rows[i].nom;
      const login = rows[i].identifiant ?? rows[i].login;
      if (loginToId[login]) {
        summary.skipped++; // déjà créé : on ne refait pas le POST
        continue;
      }
      try {
        loginToId[login] = await createEmployee(rows[i]); // mémorise le nouvel id
        summary.created++;
      } catch (err) {
        if (isAlreadyExists(err)) summary.skipped++;
        else {
          summary.failed++;
          summary.errors.push(`Employé ${rows[i].nom} : ${err.message}`);
        }
      }
    }
    // Map ref_employe -> userId (créés + déjà existants).
    rows.forEach((r) => {
      const id = loginToId[r.identifiant];
      if (id) refToUserId[r.ref_employe] = id;
    });
  }

  // ---- 2) Salaires + règlements ----
  if (salariesFile) {
    const rows = parseCSV(await readFileText(salariesFile));
    for (let i = 0; i < rows.length; i++) {
      onProgress({ step: "Import des salaires", current: i + 1, total: rows.length });
      const fkUser = refToUserId[rows[i].ref_employe];
      if (!fkUser) {
        summary.failed++;
        summary.errors.push(
          `Salaire #${rows[i].ref_salaire} : employé réf ${rows[i].ref_employe} introuvable (importez d'abord les employés)`,
        );
        continue;
      }
      try {
        const nom = refToName[rows[i].ref_employe] ?? "";
        const salaryId = await createSalary({
          fk_user: fkUser,
          label: `Salaire #${rows[i].ref_salaire} ${nom}`.trim(),
          amount: parseMontant(rows[i].montant),
          datesp: parseFrDate(rows[i].date_debut),
          dateep: parseFrDate(rows[i].date_fin),
        });
        summary.created++;

        // Règlements (paiement en plusieurs fois)
        for (const p of parsePaiements(rows[i].paiement)) {
          try {
            await addPayment(salaryId, { montant: p.montant, date: p.date });
          } catch (err) {
            summary.errors.push(
              `Règlement salaire #${rows[i].ref_salaire} : ${err.message}`,
            );
          }
        }
      } catch (err) {
        summary.failed++;
        summary.errors.push(`Salaire #${rows[i].ref_salaire} : ${err.message}`);
      }
    }
  }

  // ---- 3) Photos (ZIP) -> envoyées au backend qui les range dans Dolibarr ----
  if (photosZip && Object.keys(refToUserId).length > 0) {
    onProgress({ step: "Import des photos", current: 0, total: 0 });
    try {
      const zipBase64 = await readFileBase64(photosZip);
      const res = await fetch("/api/import-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipBase64, map: refToUserId }),
      });
      const data = await res.json();
      summary.photos = data.saved ?? 0;
      if (data.errors?.length) summary.errors.push(...data.errors);
    } catch (err) {
      summary.errors.push(`Photos : ${err.message}`);
    }
  } else if (photosZip) {
    summary.errors.push("Photos ignorées : importez les employés en même temps.");
  }

  onProgress({ step: "Terminé", current: 1, total: 1 });
  return summary;
};

// =============================================================================
// RESET  (efface règlements, salaires, employés — via l'API)
// On supprime dans cet ordre : règlements -> salaires -> employés
// (un salaire ne peut pas être supprimé s'il a encore des règlements).
// =============================================================================

export const resetData = async (onProgress = () => {}) => {
  const [payments, salaries, employees] = await Promise.all([
    getPayments(),
    getSalaries(),
    getEmployees(),
  ]);

  const items = [
    ...payments.map((p) => ({ id: p.id ?? p.rowid, del: deletePayment })),
    ...salaries.map((s) => ({ id: s.id ?? s.rowid, del: deleteSalary })),
    ...employees.map((e) => ({ id: e.id ?? e.rowid, del: deleteEmployee })),
  ].filter((it) => it.id != null);

  const total = items.length;
  let deleted = 0;
  const failures = [];
  onProgress({ current: 0, total });

  for (let i = 0; i < items.length; i++) {
    try {
      await items[i].del(items[i].id);
      deleted++;
    } catch (err) {
      failures.push({ id: items[i].id, reason: err.message });
    }
    onProgress({ current: i + 1, total });
  }

  // Vide aussi la table locale des jours fériés (SQLite).
  try {
    await fetch("/api/holidays", { method: "DELETE" });
  } catch (err) {
    console.warn("Reset jours fériés:", err.message);
  }

  return { total, deleted, failed: failures.length, failures };
};

// Export des petits utilitaires (réutilisés par les pages).
export { parseMontant, parseFrDate };

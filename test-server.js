#!/usr/bin/env node
/* eslint-disable no-console */
// =============================================================================
// test-server.js — Boîte à outils de test / manipulation des données
// =============================================================================
//
// BUT
// ----
// Ce fichier expose TOUTES les API de l'application (employés, salaires,
// règlements, jours fériés, import, reset) sous forme d'un petit "client" que
// n'importe quel agent (Claude ou autre) peut piloter en ligne de commande.
//
// On indique un SCÉNARIO à l'agent (ex. « importe les CSV, paie le salaire 4,
// crée un jour férié le 15 octobre, ajoute un salaire pour l'employé 3 pour
// atteindre un total de 15000 »). L'agent traduit ce scénario en une suite de
// commandes `node test-server.js <commande> ...` et OBSERVE le résultat.
//
// Il tape DIRECTEMENT :
//   - sur Dolibarr (API REST, clé DOLAPIKEY) pour employés/salaires/règlements ;
//   - sur l'API Express locale (port 3001) pour les jours fériés / import photos.
// => Aucun navigateur requis. Il faut juste que Dolibarr tourne (XAMPP) et, pour
//    les jours fériés, que `npm run dev` (ou `npm run server`) tourne.
//
// PRÉ-REQUIS DOLIBARR (voir mémoire dolibarr-salary-prereqs) :
//   - endpoints DELETE salaire + règlement activés ;
//   - module Banque DÉSACTIVÉ (sinon les paiements exigent un compte bancaire).
//
// UTILISATION RAPIDE
// ------------------
//   node test-server.js help                 # liste toutes les commandes
//   node test-server.js list-api             # liste toutes les API + formats
//   node test-server.js employees            # GET employés
//   node test-server.js salaries             # GET salaires
//   node test-server.js payments             # GET règlements
//   node test-server.js summary              # vue d'ensemble + totaux
//   node test-server.js import               # importe les 2 CSV + photos
//   node test-server.js pay-full <salaryId>  # paie tout le reste d'un salaire
//   node test-server.js create-salary <fk_user> <amount> [label]
//   node test-server.js update-salary <id> amount=15000 label="..."
//   node test-server.js delete-salary <id>
//   node test-server.js add-payment <salaryId> <amount> [date=YYYY-MM-DD]
//   node test-server.js holiday-add "Anniversaire be" 2026-10-15
//   node test-server.js reset                # efface tout (Dolibarr + fériés)
//   node test-server.js scenario             # rejoue LE scénario de référence
//
// Toutes les commandes acceptent des arguments `clé=valeur` qui sont fusionnés
// dans le payload — donc n'importe quel champ Dolibarr est modifiable à volonté.
// =============================================================================

import axios from "axios";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Configuration (surchargée par variables d'environnement) ---------------
const DOLIBARR_BASE_URL =
  process.env.DOLIBARR_BASE_URL ||
  "http://localhost/dolibarr-23.0.3/htdocs/api/index.php";
const DOLIBARR_API_KEY =
  process.env.DOLIBARR_API_KEY || "0484jI75pnIwAyQX4GD8N1cyb5AfKfgA";
// L'API Express (jours fériés, photos). Servie par Vite (5173) ou `npm run server` (3001).
const APP_API_URL = process.env.APP_API_URL || "http://localhost:5173";

const IMPORT_DIR = join(__dirname, "import");
const EMPLOYEES_CSV = join(IMPORT_DIR, "import-data-serie3-juin-26 - Feuille 1 (1).csv");
const SALARIES_CSV = join(IMPORT_DIR, "import-data-serie3-juin-26 - Feuille 2.csv");
const PHOTOS_ZIP = join(IMPORT_DIR, "images (1).zip");

// --- Clients HTTP ------------------------------------------------------------
const doli = axios.create({
  baseURL: DOLIBARR_BASE_URL,
  headers: { DOLAPIKEY: DOLIBARR_API_KEY, "Content-Type": "application/json" },
});
const appApi = axios.create({ baseURL: APP_API_URL });

// =============================================================================
// Helpers de parsing (repris de src/services/backoffice/dolibarr.js pour que
// l'import produise EXACTEMENT les mêmes données que le front).
// =============================================================================
const parseMontant = (v) => {
  const n = parseFloat(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};

const parseFrDate = (v) => {
  if (!v) return undefined;
  const [d, m, y] = String(v).trim().split("/");
  if (!d || !m || !y) return undefined;
  let year = Number(y);
  if (year < 100) year += 2000;
  return Math.floor(Date.UTC(year, Number(m) - 1, Number(d)) / 1000);
};

const toTimestamp = (v) => {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return v;
  if (/^\d+$/.test(String(v).trim())) return Number(v);
  const ts = Math.floor(new Date(v).getTime() / 1000);
  return Number.isFinite(ts) ? ts : undefined;
};

const parsePaiements = (v) => {
  const out = [];
  const re = /\[\s*"?([0-9/]+)"?\s*,\s*"?([0-9.,]+)"?\s*\]/g;
  let m;
  while ((m = re.exec(String(v ?? ""))) !== null) {
    out.push({ date: parseFrDate(m[1]), montant: parseMontant(m[2]) });
  }
  return out;
};

const parseCSV = (text) => {
  const lines = text.trim().split("\n").map((l) => l.replace(/\r$/, ""));
  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  return lines.slice(1).filter((l) => l.trim() !== "").map((line) => {
    const fields = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    fields.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => (obj[h] = fields[i] ?? ""));
    return obj;
  });
};

// =============================================================================
// Client Dolibarr paginé (l'API renvoie au plus 100 lignes par page).
// =============================================================================
const getAllPaged = async (endpoint, extra = {}) => {
  const all = [];
  const seen = new Set();
  for (let page = 0; page < 50; page++) {
    let items;
    try {
      const r = await doli.get(endpoint, {
        params: { sortfield: "t.rowid", sortorder: "ASC", limit: 100, page, ...extra },
      });
      items = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
    } catch (err) {
      if (page === 0 && err.response?.status === 404) return [];
      if (page === 0) throw err;
      break;
    }
    if (!items.length) break;
    let added = 0;
    for (const it of items) {
      const id = typeof it === "object" ? (it?.id ?? it?.rowid) : null;
      if (id != null) { if (seen.has(id)) continue; seen.add(id); }
      all.push(it);
      added++;
    }
    if (added === 0 || items.length < 100) break;
  }
  return all;
};

const idOf = (data) => (typeof data === "object" ? (data?.id ?? data) : data);

// =============================================================================
// CLIENT — toutes les API de l'application, prêtes à être scriptées.
// =============================================================================
export const client = {
  // ---- EMPLOYÉS (utilisateurs Dolibarr) ----
  async getEmployees() {
    const users = await getAllPaged("users");
    return users.filter((u) => Number(u.employee) === 1 && Number(u.id) !== 1);
  },
  async getUser(id) {
    return (await doli.get(`users/${id}`)).data;
  },
  async createEmployee(row) {
    const genre = String(row.genre ?? "").toLowerCase();
    const payload = {
      login: row.identifiant ?? row.login,
      lastname: row.nom ?? row.lastname,
      gender: genre.startsWith("h") ? "man" : "woman",
      employee: 1,
    };
    if (row.poste) payload.job = row.poste;
    const h = row.heure_travail_semaine ?? row.weeklyhours;
    if (h) payload.weeklyhours = parseMontant(h);
    const pass = row.mdp ?? row.password;
    if (pass && String(pass).length >= 12) payload.pass = pass;
    return idOf((await doli.post("users", payload)).data);
  },
  async updateUser(id, patch) {
    return (await doli.put(`users/${id}`, patch)).data;
  },
  async deleteEmployee(id) {
    await doli.delete(`users/${id}`);
    return true;
  },

  // ---- SALAIRES ----
  async getSalaries() {
    return getAllPaged("salaries");
  },
  async getSalary(id) {
    return (await doli.get(`salaries/${id}`)).data;
  },
  async createSalary(data) {
    // data : { fk_user, label, amount, datesp?, dateep? }
    return idOf((await doli.post("salaries", data)).data);
  },
  async updateSalary(id, patch) {
    return (await doli.put(`salaries/${id}`, patch)).data;
  },
  async deleteSalary(id) {
    await doli.delete(`salaries/${id}`);
    return true;
  },

  // ---- RÈGLEMENTS (paiements de salaire) ----
  async getPayments() {
    return getAllPaged("salaries/payments");
  },
  async addPayment(salaryId, { montant, date, type = 4 }) {
    // Module Banque DÉSACTIVÉ requis : pas d'accountid envoyé.
    const r = await doli.post(`salaries/${salaryId}/payments`, {
      chid: Number(salaryId),
      datepaye: toTimestamp(date),
      paiementtype: type,
      fk_typepayment: type,
      amounts: { [salaryId]: montant },
    });
    return r.data;
  },
  async deletePayment(id) {
    await doli.delete(`salaries/${id}/payments`);
    return true;
  },
  // Reste à payer d'un salaire (montant - somme des règlements).
  async remainingFor(salaryId) {
    const [sal, pays] = await Promise.all([this.getSalary(salaryId), this.getPayments()]);
    const paid = pays
      .filter((p) => Number(p.fk_salary) === Number(salaryId))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return Number(sal.amount || 0) - paid;
  },
  // Paie tout le reste d'un salaire (le rend "Payé").
  async payFull(salaryId, date) {
    const reste = await this.remainingFor(salaryId);
    if (reste <= 0) return { skipped: true, reste };
    await this.addPayment(salaryId, { montant: reste, date: date ?? isoToday() });
    return { paid: reste };
  },

  // ---- JOURS FÉRIÉS (SQLite via l'API Express) ----
  async getHolidays() {
    return (await appApi.get("/api/holidays")).data;
  },
  async addHoliday(label, date) {
    return (await appApi.post("/api/holidays", { label, date })).data;
  },
  async updateHoliday(id, label, date) {
    return (await appApi.put(`/api/holidays/${id}`, { label, date })).data;
  },
  async deleteHoliday(id) {
    return (await appApi.delete(`/api/holidays/${id}`)).data;
  },
  async clearHolidays() {
    return (await appApi.delete("/api/holidays")).data;
  },

  // ---- IMPORT (CSV employés + CSV salaires + photos ZIP) ----
  // Reproduit fidèlement importAll() du front pour obtenir les mêmes données.
  async importAll({ withPhotos = true } = {}) {
    const summary = { created: 0, skipped: 0, failed: 0, errors: [], photos: 0 };
    const refToUserId = {};
    const refToName = {};

    // 1) Employés
    const empRows = parseCSV(readFileSync(EMPLOYEES_CSV, "utf-8"));
    const existing = await this.getEmployees();
    const loginToId = {};
    existing.forEach((e) => (loginToId[e.login] = e.id));
    for (const row of empRows) {
      refToName[row.ref_employe] = row.nom;
      const login = row.identifiant ?? row.login;
      if (loginToId[login]) { summary.skipped++; continue; }
      try {
        loginToId[login] = await this.createEmployee(row);
        summary.created++;
      } catch (err) {
        if (isAlreadyExists(err)) summary.skipped++;
        else { summary.failed++; summary.errors.push(`Employé ${row.nom}: ${errMsg(err)}`); }
      }
    }
    empRows.forEach((r) => {
      const id = loginToId[r.identifiant];
      if (id) refToUserId[r.ref_employe] = id;
    });

    // 2) Salaires + règlements
    const salRows = parseCSV(readFileSync(SALARIES_CSV, "utf-8"));
    for (const row of salRows) {
      const fkUser = refToUserId[row.ref_employe];
      if (!fkUser) {
        summary.failed++;
        summary.errors.push(`Salaire #${row.ref_salaire}: employé réf ${row.ref_employe} introuvable`);
        continue;
      }
      try {
        const nom = refToName[row.ref_employe] ?? "";
        const salaryId = await this.createSalary({
          fk_user: fkUser,
          label: `Salaire #${row.ref_salaire} ${nom}`.trim(),
          amount: parseMontant(row.montant),
          datesp: parseFrDate(row.date_debut),
          dateep: parseFrDate(row.date_fin),
        });
        summary.created++;
        for (const p of parsePaiements(row.paiement)) {
          try {
            await this.addPayment(salaryId, { montant: p.montant, date: p.date });
          } catch (err) {
            summary.errors.push(`Règlement salaire #${row.ref_salaire}: ${errMsg(err)}`);
          }
        }
      } catch (err) {
        summary.failed++;
        summary.errors.push(`Salaire #${row.ref_salaire}: ${errMsg(err)}`);
      }
    }

    // 3) Photos (ZIP) -> API Express
    if (withPhotos && existsSync(PHOTOS_ZIP) && Object.keys(refToUserId).length) {
      try {
        const zipBase64 = readFileSync(PHOTOS_ZIP).toString("base64");
        const { data } = await appApi.post("/api/import-photos", {
          zipBase64,
          map: refToUserId,
        });
        summary.photos = data.saved ?? 0;
        if (data.errors?.length) summary.errors.push(...data.errors);
      } catch (err) {
        summary.errors.push(`Photos: ${errMsg(err)}`);
      }
    }
    return { ...summary, refToUserId };
  },

  // ---- RESET (efface règlements -> salaires -> employés + jours fériés) ----
  async resetAll() {
    const [payments, salaries, employees] = await Promise.all([
      this.getPayments(),
      this.getSalaries(),
      this.getEmployees(),
    ]);
    const items = [
      ...payments.map((p) => ({ id: p.id ?? p.rowid, del: (id) => this.deletePayment(id) })),
      ...salaries.map((s) => ({ id: s.id ?? s.rowid, del: (id) => this.deleteSalary(id) })),
      ...employees.map((e) => ({ id: e.id ?? e.rowid, del: (id) => this.deleteEmployee(id) })),
    ].filter((it) => it.id != null);

    let deleted = 0;
    const failures = [];
    for (const it of items) {
      try { await it.del(it.id); deleted++; }
      catch (err) { failures.push({ id: it.id, reason: errMsg(err) }); }
    }
    try { await this.clearHolidays(); } catch { /* API Express éteinte : on ignore */ }
    return { total: items.length, deleted, failed: failures.length, failures };
  },

  // ---- Vue d'ensemble + totaux (pour vérifier un état cible) ----
  async summary() {
    const [employees, salaries, payments, holidays] = await Promise.all([
      this.getEmployees(),
      this.getSalaries(),
      this.getPayments(),
      this.getHolidays().catch(() => []),
    ]);
    const totalSalaries = salaries.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalPaid = payments.reduce((s, x) => s + Number(x.amount || 0), 0);
    return {
      counts: {
        employees: employees.length,
        salaries: salaries.length,
        payments: payments.length,
        holidays: holidays.length,
      },
      totalSalaries,
      totalPaid,
      totalRemaining: totalSalaries - totalPaid,
      salaries: salaries.map((s) => ({
        id: s.id,
        fk_user: s.fk_user,
        label: s.label,
        amount: Number(s.amount),
      })),
      holidays,
    };
  },
};

// =============================================================================
// Petits utilitaires
// =============================================================================
function isoToday() {
  return new Date().toISOString().slice(0, 10);
}
function errMsg(err) {
  return err.response?.data?.error?.message ?? err.response?.data?.error ?? err.message;
}
function isAlreadyExists(err) {
  const blob = JSON.stringify(err.response?.data ?? err.message ?? "");
  return /AlreadyExists|already exists|existe déjà|Duplicate/i.test(blob);
}
// Parse les args "clé=valeur" en objet (valeurs numériques converties).
function parseKV(args) {
  const obj = {};
  for (const a of args) {
    const i = a.indexOf("=");
    if (i === -1) continue;
    const k = a.slice(0, i);
    let v = a.slice(i + 1);
    if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    obj[k] = v;
  }
  return obj;
}
// Arguments positionnels (sans "=").
function positional(args) {
  return args.filter((a) => !a.includes("="));
}
function out(x) {
  console.log(JSON.stringify(x, null, 2));
}

// =============================================================================
// CATALOGUE DES API (affiché par `list-api`) — la doc vivante demandée.
// =============================================================================
const API_CATALOG = [
  { group: "Employés (Dolibarr /users)", entries: [
    ["GET",    "employees",                 "Liste des employés (employee=1, hors admin)"],
    ["GET",    "user <id>",                 "Détail d'un utilisateur"],
    ["POST",   "create-employee k=v ...",   "Crée un employé (login,nom/lastname,genre,poste...)"],
    ["PUT",    "update-user <id> k=v ...",  "Modifie un utilisateur"],
    ["DELETE", "delete-employee <id>",      "Supprime un employé"],
  ]},
  { group: "Salaires (Dolibarr /salaries)", entries: [
    ["GET",    "salaries",                  "Liste des salaires"],
    ["GET",    "salary <id>",               "Détail d'un salaire"],
    ["POST",   "create-salary <fk_user> <amount> [label] [k=v]", "Crée un salaire"],
    ["PUT",    "update-salary <id> k=v ...","Modifie un salaire (amount=, label=, ...)"],
    ["DELETE", "delete-salary <id>",        "Supprime un salaire"],
  ]},
  { group: "Règlements (Dolibarr /salaries/{id}/payments)", entries: [
    ["GET",    "payments",                  "Liste de tous les règlements"],
    ["GET",    "remaining <salaryId>",      "Reste à payer d'un salaire"],
    ["POST",   "add-payment <salaryId> <amount> [date=YYYY-MM-DD] [type=4]", "Ajoute un règlement"],
    ["POST",   "pay-full <salaryId> [date=YYYY-MM-DD]", "Paie tout le reste (=> Payé)"],
    ["DELETE", "delete-payment <id>",       "Supprime un règlement"],
  ]},
  { group: "Jours fériés (API Express /api/holidays)", entries: [
    ["GET",    "holidays",                  "Liste des jours fériés"],
    ["POST",   "holiday-add <label> <YYYY-MM-DD>", "Ajoute un jour férié"],
    ["PUT",    "holiday-update <id> <label> <YYYY-MM-DD>", "Modifie un jour férié"],
    ["DELETE", "holiday-delete <id>",       "Supprime un jour férié"],
    ["DELETE", "holidays-clear",            "Vide la table des jours fériés"],
  ]},
  { group: "Global", entries: [
    ["POST",   "import [--no-photos]",      "Importe les 2 CSV + photos (mêmes données que le front)"],
    ["DELETE", "reset",                     "Efface règlements+salaires+employés+fériés"],
    ["GET",    "summary",                   "Vue d'ensemble + totaux (vérif d'un état cible)"],
    ["-",      "scenario",                  "Rejoue le scénario de référence de bout en bout"],
    ["-",      "list-api",                  "Affiche ce catalogue"],
    ["-",      "help",                      "Aide"],
  ]},
];

function printCatalog() {
  console.log("\n=== API disponibles (test-server) ===\n");
  for (const g of API_CATALOG) {
    console.log(`• ${g.group}`);
    for (const [verb, cmd, desc] of g.entries) {
      console.log(`    ${verb.padEnd(7)} ${cmd.padEnd(48)} ${desc}`);
    }
    console.log("");
  }
  console.log(`Dolibarr : ${DOLIBARR_BASE_URL}`);
  console.log(`API app  : ${APP_API_URL}  (jours fériés / photos)\n`);
}

// =============================================================================
// SCÉNARIO DE RÉFÉRENCE (celui de l'énoncé)
// -----------------------------------------------------------------------------
// 1) Importer les CSV (mêmes données que l'import du front).
// 2) Payer la TOTALITÉ du salaire réf #4.
// 3) Créer un jour férié le 15 octobre nommé "anniversaire be".
// 4) Insérer un nouveau salaire pour l'employé ref_employe 3, de sorte que le
//    TOTAL de tous les salaires soit égal à 15000.
// -----------------------------------------------------------------------------
// NB : "ref_employe 3" et "salaire réf 4" sont les références du CSV, pas les ids
// Dolibarr. On les retrouve donc via les libellés créés à l'import
// (`Salaire #4 ...`) et la map ref_employe->userId renvoyée par importAll.
// =============================================================================
async function runScenario() {
  console.log(">> 1. Import des CSV...");
  const imp = await client.importAll();
  console.log(`   créés=${imp.created} ignorés=${imp.skipped} échecs=${imp.failed} photos=${imp.photos}`);
  if (imp.errors.length) console.log("   erreurs:", imp.errors);

  // 2) Payer la totalité du salaire réf #4 (repéré par son libellé "Salaire #4").
  console.log(">> 2. Paiement total du salaire réf #4...");
  const salaries = await client.getSalaries();
  const sal4 = salaries.find((s) => /Salaire #4\b/.test(String(s.label)));
  if (!sal4) throw new Error("Salaire réf #4 introuvable après import.");
  const pf = await client.payFull(sal4.id);
  console.log("  ", pf.skipped ? `déjà payé (reste ${pf.reste})` : `payé ${pf.paid}`);

  // 3) Jour férié 15 octobre "anniversaire be".
  console.log(">> 3. Jour férié 15 octobre 'anniversaire be'...");
  const hol = await client.addHoliday("anniversaire be", "2026-10-15");
  console.log("  ", hol);

  // 4) Nouveau salaire pour ref_employe 3 => total de tous les salaires = 15000.
  console.log(">> 4. Salaire pour l'employé ref 3 => total global = 15000...");
  const userId3 = imp.refToUserId["3"];
  if (!userId3) throw new Error("Employé ref_employe=3 introuvable (userId manquant).");
  const after = await client.getSalaries();
  const currentTotal = after.reduce((s, x) => s + Number(x.amount || 0), 0);
  const missing = 15000 - currentTotal;
  console.log(`   total actuel=${currentTotal} -> à ajouter=${missing}`);
  if (missing <= 0) {
    console.log("   ⚠ total déjà >= 15000, aucun salaire ajouté.");
  } else {
    const newId = await client.createSalary({
      fk_user: Number(userId3),
      label: `Salaire complément (ref_employe 3) pour total 15000`,
      amount: missing,
    });
    console.log(`   salaire créé id=${newId} montant=${missing}`);
  }

  console.log("\n>> Vérification finale:");
  out(await client.summary());
}

// =============================================================================
// CLI
// =============================================================================
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const pos = positional(rest);
  const kv = parseKV(rest);

  try {
    switch (cmd) {
      // --- Employés ---
      case "employees": out(await client.getEmployees()); break;
      case "user": out(await client.getUser(pos[0])); break;
      case "create-employee": out(await client.createEmployee(kv)); break;
      case "update-user": out(await client.updateUser(pos[0], kv)); break;
      case "delete-employee": out(await client.deleteEmployee(pos[0])); break;

      // --- Salaires ---
      case "salaries": out(await client.getSalaries()); break;
      case "salary": out(await client.getSalary(pos[0])); break;
      case "create-salary": {
        const payload = {
          fk_user: Number(pos[0]),
          amount: parseMontant(pos[1]),
          label: pos[2] ?? `Salaire user ${pos[0]}`,
          ...kv,
        };
        out(await client.createSalary(payload));
        break;
      }
      case "update-salary": out(await client.updateSalary(pos[0], kv)); break;
      case "delete-salary": out(await client.deleteSalary(pos[0])); break;

      // --- Règlements ---
      case "payments": out(await client.getPayments()); break;
      case "remaining": out({ remaining: await client.remainingFor(pos[0]) }); break;
      case "add-payment":
        out(await client.addPayment(pos[0], {
          montant: parseMontant(pos[1]),
          date: kv.date ?? isoToday(),
          type: kv.type ?? 4,
        }));
        break;
      case "pay-full": out(await client.payFull(pos[0], kv.date)); break;
      case "delete-payment": out(await client.deletePayment(pos[0])); break;

      // --- Jours fériés ---
      case "holidays": out(await client.getHolidays()); break;
      case "holiday-add": out(await client.addHoliday(pos[0], pos[1])); break;
      case "holiday-update": out(await client.updateHoliday(pos[0], pos[1], pos[2])); break;
      case "holiday-delete": out(await client.deleteHoliday(pos[0])); break;
      case "holidays-clear": out(await client.clearHolidays()); break;

      // --- Global ---
      case "import":
        out(await client.importAll({ withPhotos: !rest.includes("--no-photos") }));
        break;
      case "reset": out(await client.resetAll()); break;
      case "summary": out(await client.summary()); break;
      case "scenario": await runScenario(); break;

      case "list-api": printCatalog(); break;
      case "help":
      case undefined:
        printCatalog();
        break;
      default:
        console.error(`Commande inconnue : "${cmd}"\n`);
        printCatalog();
        process.exit(1);
    }
  } catch (err) {
    console.error("ERREUR:", errMsg(err));
    if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
    process.exit(1);
  }
}

// N'exécute le CLI que si lancé directement (permet aussi `import { client }`).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

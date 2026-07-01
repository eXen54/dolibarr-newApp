// Connexion à la base SQLite + création des tables pour les paramètres du thème uniquement.
import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Le fichier de base est créé automatiquement au premier lancement.
const db = new Database(join(__dirname, "dolibarr.db"));

// Table pour les paramètres du thème
db.exec(`
  CREATE TABLE IF NOT EXISTS theme_settings (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    theme           TEXT NOT NULL DEFAULT 'light',
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Ligne par défaut créée une seule fois (ignorée si déjà présente).
db.exec(`INSERT OR IGNORE INTO theme_settings (id) VALUES (1)`);

// Table des jours fériés (gérés localement, hors Dolibarr).
db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    label       TEXT NOT NULL,
    date        TEXT NOT NULL,                     -- 'YYYY-MM-DD'
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export default db;

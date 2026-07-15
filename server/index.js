// API REST (thème SQLite, photos, proxy Dolibarr).
// Cet `app` Express est utilisé de DEUX façons :
//   - monté directement dans le serveur de dev Vite (cf. vite.config.js) → `npm run dev` suffit ;
//   - lancé seul via `npm run server` (utile en production).
import express from "express";
import cors from "cors";
import db from "./db.js";
import axios from "axios";
import AdmZip from "adm-zip";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = 3001;

app.use(cors()); // autorise les appels depuis le front (port Vite)
app.use(express.json({ limit: "50mb" })); // parse le body JSON (zip en base64 = gros)

// --- Routes pour les Thèmes (SQLite) ---
app.get("/api/theme", (req, res) => {
  const row = db.prepare("SELECT * FROM theme_settings WHERE id = 1").get();
  res.json(row);
});

app.put("/api/theme", (req, res) => {
  const { theme } = req.body;
  db.prepare(
    "UPDATE theme_settings SET theme = ?, updated_at = datetime('now') WHERE id = 1",
  ).run(theme);
  const updated = db.prepare("SELECT * FROM theme_settings WHERE id = 1").get();
  res.json(updated);
});

// --- CRUD Jours fériés (SQLite) ---
app.get("/api/holidays", (req, res) => {
  const rows = db.prepare("SELECT * FROM holidays ORDER BY date").all();
  res.json(rows);
});

app.post("/api/holidays", (req, res) => {
  const { label, date } = req.body;
  if (!label || !date) {
    return res.status(400).json({ error: "label et date sont requis" });
  }
  const info = db
    .prepare("INSERT INTO holidays (label, date) VALUES (?, ?)")
    .run(label, date);
  const row = db
    .prepare("SELECT * FROM holidays WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(row);
});

app.put("/api/holidays/:id", (req, res) => {
  const { label, date } = req.body;
  db.prepare("UPDATE holidays SET label = ?, date = ? WHERE id = ?").run(
    label,
    date,
    req.params.id,
  );
  const row = db
    .prepare("SELECT * FROM holidays WHERE id = ?")
    .get(req.params.id);
  res.json(row);
});

app.delete("/api/holidays/:id", (req, res) => {
  db.prepare("DELETE FROM holidays WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Sans id : vide toute la table (utilisé par le reset global).
app.delete("/api/holidays", (req, res) => {
  db.prepare("DELETE FROM holidays").run();
  res.json({ success: true });
});

// --- Proxy Dolibarr APIs (à adapter selon votre configuration Dolibarr) ---
// Exemple de proxy pour Dolibarr - vous devrez configurer correctement votre Dolibarr
// Dolibarr doit avoir l'API REST activée et les credentials configurés

// Dolibarr API configuration
const DOLIBARR_BASE_URL =
  process.env.DOLIBARR_BASE_URL ||
  "http://localhost/dolibarr-23.0.3/htdocs/api/index.php";
const DOLIBARR_API_KEY =
  process.env.DOLIBARR_API_KEY || "0484jI75pnIwAyQX4GD8N1cyb5AfKfgA";

// Dossier "documents" de Dolibarr (où sont rangées les photos des utilisateurs).
const DOLI_DOC_ROOT =
  process.env.DOLI_DOC_ROOT || "C:/xampp/htdocs/dolibarr-23.0.3/documents";

// --- Import des photos d'employés (ZIP) ---
// Le front envoie le zip en base64 + une map { ref_employe: userId }.
// On extrait chaque image (1.png → employé réf 1), on l'écrit dans le dossier
// documents/users/{id}/photos/ de Dolibarr, puis on renseigne le champ photo via l'API.
app.post("/api/import-photos", async (req, res) => {
  try {
    const { zipBase64, map } = req.body;
    if (!zipBase64 || !map) {
      return res.status(400).json({ error: "zipBase64 et map sont requis" });
    }

    const zip = new AdmZip(Buffer.from(zipBase64, "base64"));
    let saved = 0;
    const errors = [];

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const filename = entry.name; // ex: "1.png"
      const ref = filename.replace(/\.[^.]+$/, ""); // "1"
      const userId = map[ref];
      if (!userId) {
        errors.push(`${filename} : aucun employé pour la réf ${ref}`);
        continue;
      }

      try {
        const photoDir = join(DOLI_DOC_ROOT, "users", String(userId), "photos");
        mkdirSync(photoDir, { recursive: true });
        writeFileSync(join(photoDir, filename), entry.getData());

        // Renseigne le champ photo de l'utilisateur via l'API Dolibarr.
        await axios.put(
          `${DOLIBARR_BASE_URL}/users/${userId}`,
          { photo: filename },
          { headers: { DOLAPIKEY: DOLIBARR_API_KEY } },
        );
        saved++;
      } catch (err) {
        errors.push(`${filename} : ${err.message}`);
      }
    }

    res.json({ saved, errors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Sert la photo d'un employé (sans passer par l'authentification Dolibarr) ---
// GET /api/photo/:userId  -> renvoie l'image rangée dans documents/users/{id}/photos/
app.get("/api/photo/:userId", (req, res) => {
  const dir = join(DOLI_DOC_ROOT, "users", String(req.params.userId), "photos");
  if (!existsSync(dir)) return res.status(404).end();
  const images = readdirSync(dir).filter((f) =>
    /\.(png|jpe?g|gif|webp)$/i.test(f),
  );
  if (images.length === 0) return res.status(404).end();
  res.sendFile(join(dir, images[0]));
});

// Proxy Dolibarr API requests
app.use("/dolibarr-api", async (req, res) => {
  try {
    const url = `${DOLIBARR_BASE_URL}${req.path}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      params: req.query,
      headers: {
        ...req.headers,
        DOLAPIKEY: DOLIBARR_API_KEY,
        host: undefined,
      },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Erreur de connexion à Dolibarr" });
    }
  }
});

// On ne démarre un serveur autonome QUE si ce fichier est lancé directement
// (`node server/index.js` / `npm run server`). Monté dans Vite, on n'écoute pas.
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  app.listen(PORT, () => {
    console.log(`API démarrée sur http://localhost:${PORT}`);
    console.log(`  - Dolibarr Base URL: ${DOLIBARR_BASE_URL}`);
  });
}

// Exporté pour être monté comme middleware dans le serveur de dev Vite.
export default app;

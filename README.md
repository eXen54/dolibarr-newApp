# NewAPP — Gestion des salaires (connectée à Dolibarr)

Application web pour **gérer les salaires des employés** : import de données, tableau de
bord, création et paiement de salaires (en plusieurs fois), génération en masse, jours
fériés, etc. Les données (employés, salaires, règlements) sont stockées dans **Dolibarr**
via son API REST ; les paramètres locaux (thème, jours fériés) dans une petite base
**SQLite**.

**Technos** : React + Vite (front), Express + better-sqlite3 (API locale), Dolibarr 23 (données).

---

## ✅ Prérequis (à installer avant de commencer)

1. **Node.js** version 18 ou plus — https://nodejs.org
2. **XAMPP** (Apache + MySQL) — https://www.apachefriends.org
3. **Dolibarr 23.x** installé sous XAMPP (dans `C:/xampp/htdocs/`).
   Dolibarr doit être accessible dans le navigateur, par ex.
   `http://localhost/dolibarr-23.0.3/htdocs/`.

> Assure-toi qu'Apache **et** MySQL sont démarrés dans le panneau XAMPP.

---

## 1. Récupérer le code et installer

```bash
git clone https://github.com/<utilisateur>/newapp-dolibarr.git
cd newapp-dolibarr
npm install
```

---

## 2. Préparer Dolibarr (à faire une seule fois)

### 2.1 Activer les modules nécessaires
Dans Dolibarr : **Accueil → Configuration → Modules/Applications**, active :
- **Salaires** (Salaries)
- **API/Web services (REST)**

### 2.2 Récupérer une clé API
Dans Dolibarr : ouvre ta fiche **Utilisateur** (celui admin) → champ **Clé pour l'API** →
clique pour la **générer**, puis **copie-la** (tu en as besoin à l'étape 3).

### 2.3 Activer la suppression des salaires via l'API
Par défaut Dolibarr interdit de supprimer un salaire/règlement par l'API. Il faut activer
2 fonctions dans le fichier :

`C:/xampp/htdocs/dolibarr-23.0.3/htdocs/salaries/class/api_salaries.class.php`

- **Suppression d'un salaire** : cherche la méthode `delete($id)` **mise en commentaire**
  (elle est entourée de `/* ... */`, vers la ligne 234). **Enlève le `/*` au début et le
  `*/` à la fin** pour l'activer.
- **Suppression d'un règlement** : cherche le 2ᵉ bloc `delete($id)` commenté (celui avec
  `@url DELETE {id}/payments`, vers la ligne 444). **Décommente-le AUSSI**, puis
  **renomme** `delete` en **`deletePayment`** (sinon il y a deux méthodes `delete` dans la
  classe → erreur PHP).

> Ces 2 modifications sont indispensables au bouton **Reset** (qui supprime via l'API).

### 2.4 Désactiver le module « Banque »
Dans Dolibarr : **Accueil → Configuration → Modules** → **désactive « Banque/Caisse »**.
Sinon : payer un salaire exigerait un compte bancaire, et la suppression des règlements
échouerait.

---

## 3. Configurer l'application

Ouvre `server/index.js` et adapte ces 3 lignes à **ton** installation :

```js
const DOLIBARR_BASE_URL =
  process.env.DOLIBARR_BASE_URL ||
  "http://localhost/dolibarr-23.0.3/htdocs/api/index.php"; // ← chemin de TON Dolibarr
const DOLIBARR_API_KEY =
  process.env.DOLIBARR_API_KEY || "COLLE_TA_CLE_API_ICI";  // ← clé de l'étape 2.2
const DOLI_DOC_ROOT =
  process.env.DOLI_DOC_ROOT ||
  "C:/xampp/htdocs/dolibarr-23.0.3/documents";              // ← pour les photos employés
```

Mets **la même clé** dans `src/services/dolibarr.js` :
```js
const API_KEY = "COLLE_TA_CLE_API_ICI";
```

---

## 4. Lancer l'application

```bash
npm run dev
```

Puis ouvre l'adresse affichée dans le terminal (par défaut **http://localhost:5173**).

> Une seule commande suffit : `npm run dev` sert **à la fois** le site, l'accès aux données
> Dolibarr et la base SQLite. (Inutile de lancer `npm run server` séparément.)

---

## 5. Utiliser l'application

Sur la page d'accueil, deux espaces :

### 🛠️ BackOffice (administration) — code d'accès : `ADMIN2026`
- **Dashboard** : salaires par genre et par mois (dû / payé), métriques, tableaux.
- **Importation** : charge **3 fichiers ensemble** :
  1. *Employés* (CSV) · 2. *Salaires* (CSV) · 3. *Photos* (ZIP, images nommées par réf. employé).
  Des fichiers de test sont fournis dans le dossier **`import/`**.
- **Jours fériés** : ajouter / modifier / supprimer (stockés en local).
- **Thème** : clair / sombre / Dolibarr.
- **Reset** : efface **toutes** les données (employés, salaires, règlements, jours fériés).

### 👥 FrontOffice
- **Salaires** : liste des salaires + recherche multi-critères + bouton **Payer** (paiement en plusieurs fois via un modal).
- **Nouveau** : créer un salaire pour un employé.
- **Génération** : générer un salaire pour **plusieurs employés** filtrés (poste, genre, heures), avec personnalisation possible par employé.
- **Salariés** : liste des employés (colonnes triables) → fiche détaillée (infos + historique salaires/paiements + reste à payer).

**Ordre conseillé la 1ʳᵉ fois** : BackOffice → *Importation* (les 3 fichiers de `import/`) → puis explore le Dashboard et le FrontOffice.

---

## 6. Problèmes fréquents (dépannage)

| Symptôme | Cause / Solution |
|---|---|
| `500 ... password must have at least 12 chars` à l'import | Dolibarr exige un mot de passe ≥ 12 caractères. L'app l'ignore automatiquement s'il est trop court (l'employé est quand même créé). Rien à faire. |
| `500 ... Login already exists` | L'employé existe déjà (ré-import). L'app le saute automatiquement. Pour repartir de zéro, utilise **Reset**. |
| Les salaires/règlements ne se suppriment pas (Reset) | Vérifie l'étape **2.3** (méthodes `delete` activées) et **2.4** (module Banque désactivé). |
| Payer un salaire réclame un compte bancaire | Le module **Banque** est encore actif → désactive-le (étape 2.4). |
| Les photos ne s'affichent pas | Vérifie `DOLI_DOC_ROOT` dans `server/index.js` (chemin du dossier `documents` de Dolibarr). |
| `Port ... in use` au lancement | Un serveur tourne déjà. Ferme-le, ou Vite prendra automatiquement le port suivant (5174, …). |
| Aucune donnée n'apparaît | Apache + MySQL démarrés dans XAMPP ? URL et clé API corrects (étape 3) ? |

---

## 7. Structure du projet (repères)

```
server/            API locale (Express) : proxy Dolibarr, thème + jours fériés (SQLite)
src/services/      Appels à l'API (dolibarr.js, holidays.js) + utilitaires (format.js)
src/pages/BackOffice/   Dashboard, Import, Holidays, Reset, Theme, Login
src/pages/FrontOffice/  Salaries, SalaryForm, SalaryDetail, GenerateSalaries, EmployeeList/Detail
src/components/     Navbar, Layout, Modal, PaymentModal, ThemeToggle
import/            Fichiers de données (réels + jeux de test 60 lignes)
```

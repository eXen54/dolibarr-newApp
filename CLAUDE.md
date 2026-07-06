# newapp-dolibarr

Application React/Vite + API Express de **gestion des salaires**, adossée à un
Dolibarr 23.0.3 local (XAMPP). Le front parle à Dolibarr via le proxy `/dolibarr-api`
(monté dans Vite) et gère les jours fériés / photos via l'API Express (`/api/...`).

- Lancer : `npm run dev` (Vite sert le front **et** l'API Express — pas de serveur séparé).
- Pré-requis Dolibarr non-évidents : endpoints DELETE salaire/règlement activés,
  module Banque **désactivé**. Voir la mémoire `dolibarr-salary-prereqs`.

## Manipuler les données : `test-server.js`

**`test-server.js` est LE moyen canonique de lire/insérer/modifier/supprimer les
données** (employés, salaires, règlements, jours fériés) sans passer par le navigateur.
C'est un CLI Node qui tape directement sur Dolibarr (DOLAPIKEY) et sur l'API Express.

Quand on demande d'« utiliser test-server » pour exécuter un scénario, traduire le
scénario en commandes `node test-server.js ...` puis vérifier avec `summary`.

```
node test-server.js list-api      # catalogue de TOUTES les API + formats
node test-server.js summary       # counts + totaux (vérifier un état cible)
node test-server.js import        # importe les 2 CSV + photos (= données du front)
node test-server.js scenario      # rejoue le scénario de référence de bout en bout
node test-server.js reset         # efface tout
```

Toutes les entités sont CRUD-ables ; tout argument `clé=valeur` est fusionné dans le
payload, donc n'importe quel champ Dolibarr est modifiable. Exemples :

```
node test-server.js create-salary <fk_user> <amount> [label]
node test-server.js update-salary <id> amount=15000 label="..."
node test-server.js pay-full <salaryId>        # paie tout le reste => "Payé"
node test-server.js add-payment <salaryId> <amount> [date=YYYY-MM-DD]
node test-server.js holiday-add "anniversaire be" 2026-10-15
```

Le `client` est aussi exporté pour scripter : `import { client } from "./test-server.js"`.
Config surchargée par env : `DOLIBARR_BASE_URL`, `DOLIBARR_API_KEY`, `APP_API_URL`.

Notes utiles :
- Les **références du CSV** (`ref_employe`, `ref_salaire`) ne sont **pas** les ids
  Dolibarr. On retrouve un salaire par son libellé (`Salaire #4 ...`) et l'employé
  via la map `ref_employe -> userId` renvoyée par `import`.
- Ré-importer est idempotent côté employés (logins existants ignorés), mais **recrée**
  les salaires — faire `reset` avant si on veut repartir propre.

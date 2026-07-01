# Référence API Dolibarr 23 — NewApp

Document de repérage pour le projet NewApp (React) ↔ Dolibarr 23 via le proxy local.

> Sujet d'examen : modules **Produit / Entrepôt / Congé / Note de frais** + réinitialisation
> de données, import de fichier, et SQLite pour le thème.

---

## 1. Architecture des appels

```
React (Vite, :5173)
   └─ axios → http://localhost:3001/dolibarr-api/<endpoint>   (proxy Express)
                └─ server/index.js réécrit vers :
                   http://localhost/dolibarr-23.0.3/htdocs/api/index.php/<endpoint>
                   + header DOLAPIKEY ajouté automatiquement
```

| Fichier | Rôle |
|---|---|
| `src/services/dolibarr.js` | Instance axios (baseURL `:3001/dolibarr-api`, header `DOLAPIKEY`) |
| `src/services/backoffice/dolibarr.js` | Toutes les fonctions métier (get/create/delete, import, reset) |
| `server/index.js` | Proxy Express + routes SQLite du thème |
| `server/db.js` + `server/dolibarr.db` | Base SQLite (thème) |

- **Clé API** : `0484jI75pnIwAyQX4GD8N1cyb5AfKfgA` (header `DOLAPIKEY`).
- **Base Dolibarr** : `http://localhost/dolibarr-23.0.3/htdocs/api/index.php`
  (surchargeable par `DOLIBARR_BASE_URL` / `DOLIBARR_API_KEY` en variables d'env).

---

## 2. Endpoints utilisés

| Domaine | Endpoint REST | Module Dolibarr à activer |
|---|---|---|
| Produits | `products` | **Produits** |
| Entrepôts | `warehouses` | **Stock** |
| Congés | `holidays` ⚠️ (PAS `leaves`) | **Demandes de congés** |
| Notes de frais | `expensereports` | **Notes de frais** |
| (requis) Utilisateurs | `users` | **Utilisateurs & Groupes** |
| (requis) Serveur REST | — | **API/Web services (serveur REST)** |

> ⚠️ Le nom de l'API congés est **`holidays`**. `leaves` n'existe pas → renvoie 501.

---

## 3. Champs requis par entité (POST de création)

Vérifié dans le code source officiel Dolibarr (méthode `_validate()` de chaque classe API).
Tout champ obligatoire manquant → **400 `<champ> field missing`**.

### Produit — `POST /products`
| Champ | Requis | Note |
|---|---|---|
| `ref` | ✅ | **Doit être UNIQUE** (un doublon → 500) |
| `label` | ✅ | Libellé |
| `type` | ⛔ optionnel | `0` = produit, `1` = service |
| `status` | ⚠️ recommandé | `tosell` — **si 0, le produit est MASQUÉ par GET /products** |
| `status_buy` | ⚠️ recommandé | `tobuy` |
| `price` | ⛔ optionnel | nombre (HT) |
| `weight` | ⛔ optionnel | nombre |

> ⚠️ **Piège `tosell` :** par défaut `GET /products` ne renvoie que les produits
> vendables/achetables. Un produit créé sans `status:1` a `tosell=0` en base et
> devient **invisible via l'API** (l'accueil affiche 0, le reset ne le supprime pas).
> Solution lecture : `GET /products?sqlfilters=(t.tosell:in:0,1)` pour tout voir.

### Entrepôt — `POST /warehouses`
| Champ | Requis | Note |
|---|---|---|
| `label` | ✅ | Seul champ obligatoire |
| `description` / `address` / `zip` / `town` | ⛔ | optionnels |
| `country_id` | ⛔ | `1` = France |

### Congé — `POST /holidays`
| Champ | Requis | Note |
|---|---|---|
| `fk_user` | ✅ | ID d'un **utilisateur existant** (pas `user_id` !) |
| `date_debut` | ✅ | voir §4 format date |
| `date_fin` | ✅ | |
| `fk_validator` | ✅ | **ID de l'approbateur** — sinon `ErrorBadParameterFkValidator` (500). Non listé dans `$FIELDS` mais exigé par `Holiday::create()` |
| `fk_type` | ⛔ recommandé | ID d'un **type d'absence existant** : 1=SICK, 2=OTHER, 4=RTT (PAS de 3 !) |

> ⚠️ **Piège `fk_validator` :** l'API ne le déclare pas obligatoire mais la création
> échoue en 500 (`ErrorBadParameterFkValidator`) s'il est absent. Toujours l'envoyer.
> ⚠️ Les `fk_user` / `fk_validator` doivent pointer vers des users réels (ici seul
> l'id 1 `dolibarr` existe).

### Note de frais — `POST /expensereports`
| Champ | Requis | Note |
|---|---|---|
| `fk_user_author` | ✅ | ID d'un **utilisateur existant** (pas `user_id` !) |
| `date_debut` | ✅ | |
| `date_fin` | ✅ | était **manquant** dans le code initial |
| `total_ttc` | ⛔ | montant |

---

## 3bis. Pagination ⚠️ (piège majeur)

L'API Dolibarr **indexe les pages à partir de 0** : `page=0` = 1ʳᵉ page, `page=1` = 2ᵉ page.

> ❌ Bug classique : envoyer `page=1` au premier appel (ex. `page+1`) **saute la 1ʳᵉ page**.
> Avec 5 éléments et `limit=100`, `page=1` renvoie `[]` → l'accueil affiche 0 et le
> reset ne supprime rien, alors que les données existent en base.
> ✅ Correct : commencer à `page=0`.

```
GET /products?limit=100&page=0   → 5 produits
GET /products?limit=100&page=1   → []   (2ᵉ page, vide)
```

## 4. Format des dates ⚠️

Dolibarr préfère un **timestamp Unix (entier, en secondes)** pour les champs date de l'API.
La chaîne `YYYY-MM-DD` est parfois ignorée selon l'endpoint.

```js
// Conversion recommandée avant POST :
const toTs = (d) => Math.floor(new Date(d).getTime() / 1000);
// "2026-07-01" → 1782950400
```

> Si congés/notes de frais échouent malgré `fk_user` correct, **convertir les dates en timestamp**.

---

## 5. Format des fichiers CSV (import)

Le parseur (`parseCSV`) lit la 1ʳᵉ ligne comme en-têtes. Le code accepte plusieurs alias,
mais voici les en-têtes **sûrs** :

**produits.csv**
```csv
ref,label,price,weight
PROD-001,Clavier,29.90,0.5
PROD-002,Souris,15.00,0.2
```
> `ref` doit être unique sur l'ensemble du Dolibarr (sinon 500).

**entrepots.csv**
```csv
label,address,zip,town
Entrepot Nord,12 rue A,75001,Paris
```

**conges.csv**
```csv
fk_user,date_debut,date_fin,fk_type
1,2026-07-01,2026-07-05,1
```
> `fk_user` = ID employé réel ; `fk_type` = ID type d'absence réel.

**notes_de_frais.csv**
```csv
fk_user_author,date_debut,date_fin,total_ttc
1,2026-07-01,2026-07-01,42.50
```

---

## 6. Codes d'erreur — interprétation rapide

| Code | Signification | Cause typique ici |
|---|---|---|
| **401** | Non authentifié | `DOLAPIKEY` absente / invalide |
| **403** | Interdit | Module **désactivé** OU **permission manquante** (lecture/suppression). Ex. `DELETE /warehouses` → 403 tant que *Supprimer entrepôts* n'est pas coché pour l'utilisateur de la clé API |
| **400** | Requête invalide | Champ obligatoire manquant / mauvais nom de champ |
| **404** | Introuvable | ID inexistant (= permission OK, objet absent) |
| **500** | Erreur serveur Dolibarr | `ref` produit en **doublon** (`AlreadyExists`) ou validation interne (ex. congé sans `fk_validator`) |
| **501** | Non implémenté | Endpoint inexistant (ex. `leaves`) ou module non activé |

> **Permissions de suppression (pour le Reset)** : l'utilisateur de la clé API doit avoir,
> par module : *Supprimer les produits*, *Supprimer entrepôts* (Stock), *Supprimer
> demandes de congé*, *Supprimer les notes de frais*. Un droit manquant → 403 sur le
> DELETE correspondant (le reset compte alors l'échec et continue).

> ⚠️ **BUG Dolibarr 23.0.3 — DELETE /warehouses renvoie 403 même avec les droits.**
> Cause : dans `htdocs/product/stock/class/api_warehouses.class.php`, les méthodes
> `update()` (ligne 279) et `delete()` (ligne 349) appellent
> `_checkAccessToResource('stock', $id)` **sans** le nom de table. Du coup
> `checkUserAccessToObject` interroge `llx_stock` (table inexistante) au lieu de
> `llx_entrepot` → accès refusé → 403 « Access not allowed ».
> La méthode `get()` (ligne 87) passe correctement `'entrepot'` en 3ᵉ argument.
> **Correctif** : ajouter `, 'entrepot'` aux lignes 279 et 349 :
> ```php
> if (!DolibarrApi::_checkAccessToResource('stock', $this->warehouse->id, 'entrepot')) {
> ```
> (sauvegarde : `api_warehouses.class.php.bak`). À réappliquer si Dolibarr est réinstallé/mis à jour.

---

## 7. SQLite (thème) — routes locales (PAS Dolibarr)

| Méthode | Route | Effet |
|---|---|---|
| `GET` | `:3001/api/theme` | Lit le thème courant |
| `PUT` | `:3001/api/theme` | `{ "theme": "dark" }` → met à jour |

Table : `theme_settings (id=1, theme, updated_at)` dans `server/dolibarr.db`.

---

## 8. Checklist de démarrage

1. Dolibarr lancé en local (Apache/MySQL via XAMPP/WAMP).
2. Modules activés : **API REST, Produits, Stock, Congés, Notes de frais, Utilisateurs**.
3. Clé API générée pour un utilisateur (onglet utilisateur → DOLAPIKEY).
4. Swagger vérifié : `…/api/index.php/explorer/` doit lister products/warehouses/holidays/expensereports.
5. `npm run server` (proxy :3001) + `npm run dev` (front Vite).

---

## Sources

- [Module Web Services API REST — Wiki Dolibarr](https://wiki.dolibarr.org/index.php/Module_Web_Services_API_REST_(developer))
- Code source des classes API (`api_products`, `api_warehouses`, `api_holidays`, `api_expensereports`) — dépôt Dolibarr/dolibarr.
- [Issue #14796 — format date timestamp REST](https://github.com/Dolibarr/dolibarr/issues/14796)
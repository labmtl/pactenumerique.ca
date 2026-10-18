# Directives & Architecture pour Agents IA (AGENTS.md)

> Ce fichier est l'index d'architecture et de développement pour les agents IA (Antigravity, Cursor, Copilot). Il sert de source unique de vérité pour éliminer le temps d'analyse exploratoire et accélérer le cycle de modification.

---

## ⚡ En Bref : Pile Technique & Règles Clés

- **Architecture :** Application web légère sans étape de compilation (Zero-build : HTML5, Vanilla CSS3, Vanilla ES Modules, Express.js backend).
- **Persistance :** PostgreSQL en production (WHC.ca) avec bascule transparente en mémoire (`In-Memory`) en développement si la BD n'est pas configurée.
- **Sécurité & Confidentialité :** *Zero-Knowledge* strict. La clé du cercle voyage uniquement dans le fragment d'URL (`#cercle=...&k=...`) jamais transmis au serveur.
- **Règles UX Citoyenne :** Aucun jargon technique (ActivityPub, Matrix, PDS, hachage, RTA) dans le flux principal. Termes d'usage simples (« Messagerie privée chiffrée », « Alternative libre et sans pub »).
- **Règle d'or JS :** `public/js/app.js` est à la fois exécuté dans le navigateur et importé par les tests Node.js. Tout accès aux objets globaux (`window`, `document`) **DOIT** être encapsulé dans `if (typeof window !== 'undefined' && typeof document !== 'undefined')`.

---

## 🗺️ Cartographie des Fichiers (Index Rapide)

| Domaine | Fichier Source | Description |
| :--- | :--- | :--- |
| **Accueil (Action Citoyenne)** | `public/index.html` | Page principale : engagement en 2 étapes, jauge visuelle, partage SMS/WhatsApp. |
| **Répertoire Dédié** | `public/repertoire.html` | Catalogue complet des instances avec recherche, filtres et détails d'infrastructure repliables. |
| **Statistiques Dédiées** | `public/statistiques.html` | Compteur national, progression provinciale et palmarès des RTA/quartiers. |
| **Logique Client** | `public/js/app.js` | Modèle de données client, i18n, gestion du formulaire, résolution de ville, Web Push, jauge. |
| **Feuille de Styles** | `public/css/style.css` | Styles CSS modernes, variables HSL, cartes, jauge, bulles de partage. |
| **Traductions** | `public/locales/fr.json` & `en.json` | Textes et libellés bilingues (FR/EN). |
| **Catalogue Données** | `public/data/alternatives.json` | Données normalisées des plateformes et instances québécoises/canadiennes (`established` YYYY-MM). |
| **Archives de Longévité** | `data/longevity/*.json` | Audits originaux archivés (RDAP/WHOIS + Wayback CDX) pour éviter les requêtes réseau répétitives. |
| **Script Audit Longévité** | `scripts/audit-longevity.js` | Commande d'audit automatique (`npm run audit:longevity`) avec cache prioritaire. |
| **Serveur & API** | `src/server.js` | Routes Express (`/api/pact/commit`, `/api/circle/join`, `/repertoire`, `/statistiques`). |
| **Persistance & Masse Critique** | `src/services/dbService.js` | Logique d'agrégation territoriale, gestion des cercles et déclenchement au seuil. |
| **Cryptographie** | `src/services/cryptoService.js` | Hachage HMAC-SHA256 avec sel serveur, génération de jetons aveugles. |
| **Notifications Push** | `src/services/pushNotifier.js` | Envoi Web Push VAPID aux membres du cercle lors du déblocage. |

---

## 🚫 Fichiers Lourds à NE PAS Lire Systématiquement

Pour éviter de saturer le contexte et ralentir l'analyse :
- **NE PAS LIRE** `ALTERNATIVES.md` (38 Ko) : contient le catalogue brut de recherche documentaire. Consulter directement `public/data/alternatives.json`.
- **NE PAS LIRE** `DESIGN.md` (18 Ko) ou `TESTING.md` (14 Ko) lors des modifications courantes. Les principes actifs sont synthétisés dans ce fichier `AGENTS.md`.

---

## 🧪 Commandes de Test & Validation Ultra-Rapides

- **Tests unitaires rapides (sans réseau / < 50ms) :**
  ```bash
  node --test tests/longevity.test.js tests/uxLogic.test.js tests/alternatives.test.js tests/db.test.js
  ```
- **Suite de tests complète :**
  ```bash
  npm test
  ```
  *(Note : `tests/api.test.js` requiert l'accès réseau loopback `127.0.0.1` pour les requêtes HTTP mockées).*
- **Démarrage serveur local :**
  ```bash
  npm run dev
  ```
  *(Disponible sur `http://localhost:3000`).*

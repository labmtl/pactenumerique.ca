# Guide de test et validation - Pacte Numérique Canada

Ce guide fournit l'ensemble des procédures pour tester, valider et vérifier le bon fonctionnement de l'application **PacteNumérique.ca** sans recourir à des sessions de fureteur automatisées coûteuses en jetons.

---

## 1. Tests automatisés en ligne de commande (CLI)

### Exécuter la suite complète de tests unitaires et d'intégration
```bash
npm test
```
**Ce qui est validé (29 tests, 5 suites) :**
- **Catalogue des alternatives (`alternatives.test.js`) :**
  - Validité du JSON normalisé et non-redondant dans `public/data/alternatives.json`.
  - Présence des champs canoniques obligatoires (`id`, `name`, `url`, `category`, `protocol`, `support_fr`, `support_en`).
  - **Audit de transparence & souveraineté logicielle :**
    - Présence de la pile logicielle (`stack.name`, `stack.is_opensource`, `stack.repo_url`).
    - Présence du code source du projet / déploiement (`project_source.is_available`, `project_source.repo_url`).
    - **100% des plateformes reposent sur une pile logicielle libre** (`stack.is_opensource === true`).
  - **Élimination des redondances :** Aucune clé de traduction ou booléen redondant dans le JSON; textes multilingues et descriptions gérés proprement dans `locales/fr.json` et `locales/en.json`.
  - **Hiérarchie territoriale :** Toute solution avec `city === 'Montreal'` est automatiquement reconnue à Montréal, au Québec et au Canada (`city` $\subset$ `province` $\subset$ `country`).
  - Vérification que **100% des solutions montréalaises et québécoises offrent un support en français** (`support_fr === true`).
  - Présence d'au moins une alternative québécoise pour chaque besoin majeur (microblogging, photos, forums, vidéo, messagerie, pro, événements).
  - Validation des algorithmes de tri prioritaire territorial (Montréal puis Québec puis Canada).
- **Intégration API HTTP REST (`api.test.js`) :**
  - `GET /api/health` (200 OK).
  - `GET /api/stats/territory` (agrégats nationaux et par FSA).
  - `GET /api/stats/alternatives` (répertoire des réseaux souverains).
  - `POST /api/pact/commit` (validation du code postal canadien, anonymisation RTA).
  - `POST /api/circle/join` (incrémentation aveugle du compteur).
- **Service cryptographique (`cryptoService.test.js`) :**
  - Hachage salé déterministe (SHA-256 + HMAC).
  - Format des Blind IDs (64 caractères hexadécimaux).
  - Preuve de travail (Proof-of-Work anti-spam).
- **Service de persistance (`dbService.test.js`) :**
  - Mode mémoire (In-Memory fallback) et requêtes PostgreSQL.
  - Déclenchement de seuil de masse critique.
- **Codes postaux canadiens (`postalCodes.test.js`) :**
  - Validation des formats (ex: `H2T 2N5`, `G1R 2J7`).
  - Extraction de la RTA (FSA).
  - Association de la province (G, H, J $\rightarrow$ QC, etc.).

---

### Vérification de l'état en direct des plateformes répertoriées
```bash
npm run test:urls
```
Ce script vérifie de manière asynchrone la disponibilité HTTP (statut `200 OK`, latence, indicateurs régionaux `[⚜️ QC]` / `[🇨🇦 CA]` et support linguistique `[FR/EN]` / `[FR]`) de toutes les instances sans charger de navigateur.

---

## 2. Protocole de validation manuelle pour développeur

Lancez le serveur local :
```bash
npm run dev
```
Ouvrez votre navigateur sur : **`http://localhost:3000/?lang=fr`**

### Étape A : Parité des emblèmes (⚜️, 🍁 et Rosace de Montréal) et détection territoriale
1. **En-tête et identité visuelle :**
   - Observez le logo dans la barre de navigation : il affiche les deux emblèmes sur un pied d'égalité **`⚜️ 🍁 PacteNumérique.ca`**.
   - Observez le badge héro : **`⚜️ 🍁 Action collective québécoise & canadienne pour la souveraineté numérique`**.
   - Observez les compteurs : **`Québécois et Canadiens engagés`** et **`⚜️ 🍁 WHC - Hébergement souverain (QC & CA)`**.
2. **Champ Code postal (Étape 1) - Détection Montréal vs Québec vs Canada :**
   - **Montréal (RTA commençant par 'H', ex: `H2T 2N5` Plateau, `H3A 0G4` Ville-Marie) :**
     - Le badge affiche : `📍 [Rosace MTL] QC - Montréal / Laval` avec le style rouge montréalais (`.geo-badge.mtl`).
     - L'alerte d'étape 2 affiche : `[Rosace MTL] Solutions hébergées à Montréal priorisées (Loi 25)`.
     - Les 7 solutions hébergées à Montréal (La Pataterie, Jasette FACiLe, Koumbit, PeerTube DIRO, Canal FACiLe, Passerelles, Babillard En commun) sont **triées en toute première position**.
   - **Reste du Québec (RTA commençant par 'G' ou 'J', ex: `G1R 2J7` Québec, `J8X 1A1` Gatineau) :**
     - Le badge affiche : `📍 ⚜️ QC - Québec (...)` en bleu azur fleurdelisé (`.geo-badge.qc`).
     - L'alerte d'étape 2 affiche : `⚜️ Solutions hébergées au Québec priorisées (Loi 25)`.
   - **Reste du Canada (hors Québec, ex: `M5V 2T6` Toronto, `V6B 1A1` Vancouver) :**
     - Le badge affiche : `📍 🍁 ON - Ontario (...)` en rouge érable canadien (`.geo-badge.ca`).

---

### Étape B : Recommandations locales (Étape 2 du formulaire)
1. Cochez vos réseaux à quitter (ex: `X / Twitter` et `Instagram`).
2. **Pour un résident de Montréal (code postal en H) :**
   - Les fiches montréalaises affichent la pastille rouge `[Rosace MTL] Hébergé à MTL` et un liseré rouge montréalais (`.recom-card.mtl-card`).
   - Les autres fiches québécoises affichent `⚜️ Hébergé au QC` et un liseré bleu royal.
   - Les fiches pancanadiennes affichent `🍁 Hébergé au CA` et un liseré rouge érable.
3. **Pastilles de langues :**
   - Affichent clairement : `⚜️ FR`, `🍁 EN` ou `⚜️ 🍁 FR/EN`.

---

### Étape C : Répertoire interactif et filtres régionaux & linguistiques
Faites défiler la page jusqu'au **Répertoire des réseaux sociaux souverains** (`#repertoire`) :

1. **Filtres de région :**
   - `⚜️ 🍁 Toutes les régions` (affiche l'ensemble des 17 plateformes)
   - `[Rosace MTL] Montréal` (filtre immédiatement sur les 7 plateformes hébergées à Montréal)
   - `⚜️ Québec` (affiche les 13 plateformes québécoises, **incluant automatiquement toutes les solutions de Montréal**)
   - `🍁 Canada` (affiche les plateformes d'envergure pancanadienne)
2. **Filtres linguistiques :**
   - `Toutes les langues`
   - `⚜️ Support français`
   - `🍁 Support anglais`
   - `⚜️ 🍁 Bilingue (FR/EN)`
3. **Identification des solutions de Montréal dans les cartes :**
   - Les cartes hébergées à Montréal affichent :
     - Un liseré supérieur rouge montréalais (`.instance-card.mtl-card`).
     - Le badge territorial : `[Rosace MTL] Montréal`.
     - Le badge provincial : `⚜️ Québec` (démontrant l'inclusion automatique Montréal $\subset$ Québec $\subset$ Canada).
     - Le badge d'hébergement : `[Rosace MTL] Hébergé à Montréal` (conformité Loi 25).
     - Le badge linguistique et le protocole ouvert.

---

### Étape D : Bascule de langue (Bilinguisme FR / EN)
1. Cliquez sur le bouton de langue en haut à droite (`EN` / `FR`) :
2. **Résultats attendus :**
   - En anglais (`?lang=en`) :
     - Le titre de région affiche **`⚜️ Quebec`** (la fleur de lys est préservée).
     - Les filtres de langue deviennent : `All languages`, `⚜️ French support`, `🇨🇦 English support`, `🌐 Bilingual (FR/EN)`.
     - Les descriptions des fiches basculent en anglais tout en conservant les badges de souveraineté.

---

## 3. Validation rapide via cURL

Pour tester les réponses du backend sans interface graphique :

```bash
# 1. Vérifier la santé du service
curl -s http://localhost:3000/api/health | jq .

# 2. Vérifier le catalogue des alternatives
curl -s http://localhost:3000/api/stats/alternatives | jq '.[0]'

# 3. Tester la validation d'un code postal invalide (doit renvoyer HTTP 400)
curl -s -X POST http://localhost:3000/api/pact/commit \
  -H "Content-Type: application/json" \
  -d '{"postalCode":"12345"}' | jq .

# 4. Tester l'engagement avec un code postal québécois
curl -s -X POST http://localhost:3000/api/pact/commit \
  -H "Content-Type: application/json" \
  -d '{"postalCode":"H2T 2N5","blindCircleId":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","targetCount":5}' | jq .
```

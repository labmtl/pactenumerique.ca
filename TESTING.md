# Guide de test et validation - Pacte Numérique Canada

Ce guide fournit l'ensemble des procédures pour tester, valider et vérifier le bon fonctionnement de l'application **PacteNumérique.ca** sans recourir à des sessions de fureteur automatisées coûteuses en jetons.

---

## 1. Tests automatisés en ligne de commande (CLI)

### Exécuter la suite complète de tests unitaires et d'intégration
```bash
npm test
```
**Ce qui est validé (25 tests, 5 suites) :**
- **Catalogue des alternatives (`alternatives.test.js`) :**
  - Validité du JSON dans `public/data/alternatives.json`.
  - Présence des champs obligatoires et URLs HTTPS.
  - Vérification que **100% des solutions québécoises offrent un support en français** (`support_fr === true`).
  - Présence d'au moins une alternative québécoise pour chaque besoin majeur (microblogging, photos, forums, vidéo, messagerie, pro, événements).
  - Validation de l'algorithme de tri prioritaire pour les résidents du Québec.
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

### Étape A : Fleur de lys et détection territoriale (Étape 1 du formulaire)
1. Dans le champ **Code postal**, saisissez un code postal du Québec :
   - Exemple : `H2T 2N5` (Montréal) ou `G1R 2J7` (Québec) ou `J4B 5K1` (Boucherville).
2. **Résultats attendus :**
   - Le badge affiche une **fleur de lys** : `📍 ⚜️ QC - Québec (Montréal / Laval)`.
   - Le badge utilise la couleur bleue azur du fleurdelisé québécois (et non le rouge canadien).
   - Dans l'encart d'étape 2, le bandeau d'alerte apparaît :  
     `⚜️ Solutions hébergées au Québec priorisées (Loi 25)`.
3. Saisissez un code postal hors Québec (ex: `M5V 2T6` pour Toronto ou `V6B 1A1` pour Vancouver) :
   - Le badge affiche : `📍 🇨🇦 ON - Ontario (Grand Toronto)` ou `📍 🇨🇦 BC - Colombie-Britannique`.
   - Le bandeau de priorité québécoise se masque automatiquement.

---

### Étape B : Recommandations prioritaires pour le Québec (Étape 2 du formulaire)
1. Sélectionnez vos réseaux à quitter (ex: `X / Twitter` et `Instagram`).
2. Pour un résident du Québec (code postal commençant par G, H ou J) :
   - Les cartes proposées sont **prioritairement les solutions hébergées au Québec** :
     - **Qlub** (`⚜️ Hébergé au QC`, `FR/EN`)
     - **Mastodon Québec** (`⚜️ Hébergé au QC`, `FR/EN`)
     - **Pixelfed Canada** (`⚜️ Hébergé au QC - Beauharnois`, `FR/EN`)
     - **La Pataterie** (`⚜️ Hébergé au QC`, `FR/EN`)
     - **Jasette FACiLe** (`⚜️ Hébergé au QC`, `FR`)
   - Chaque carte affiche la pastille `⚜️ Hébergé au QC` et son badge de langue (`FR` ou `FR/EN`).
   - Cliquez sur une carte pour la sélectionner : une bordure verte et une coche de validation confirment la sélection.

---

### Étape C : Répertoire interactif et filtres linguistiques
Faites défiler la page jusqu'à la section **Répertoire des réseaux sociaux souverains** (`#repertoire`) :

1. **Icône du filtre Québec :**
   - Vérifiez que le bouton de filtre de région affiche bien **`⚜️ Québec`** avec une fleur de lys (et non la feuille d'érable).
2. **Filtres linguistiques :**
   - La barre de filtres propose :
     - `Toutes les langues`
     - `⚜️ Support français`
     - `🇨🇦 Support anglais`
     - `🌐 Bilingue (FR/EN)`
3. **Tester le filtre `⚜️ Québec` :**
   - Cliquez sur `⚜️ Québec` : seules les 13 solutions québécoises s'affichent.
   - Les cartes arborent un bandeau latéral bleu azur, le tag `⚜️ Québec` et le badge `⚜️ Hébergé au Québec`.
4. **Tester le filtre linguistique `⚜️ Support français` :**
   - Cliquez sur `⚜️ Support français` : toutes les plateformes disposant d'un support francophone validé apparaissent avec la pastille `✔ FR`.
5. **Tester le filtre linguistique `🇨🇦 Support anglais` :**
   - Cliquez sur `🇨🇦 Support anglais` : les plateformes bilingues offrant également un support anglophone apparaissent (`✔ EN`).
6. **Tester la recherche textuelle :**
   - Tapez `Lévis` ou `Beauharnois` ou `Matrix` dans le champ de recherche pour valider le filtrage instantané.

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

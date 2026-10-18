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

---

### Étape E : Vérification de la persistance des notifications du fureteur
1. **Activation initiale :**
   - Dans le formulaire (Étape 4 : Notification de bascule), cliquez sur le bouton **`Activer la notification du fureteur`**.
   - Autorisez les notifications dans la boîte de dialogue de votre navigateur.
   - Le bouton devient vert : **`✓ Activé`** (ou `✓ Enabled` en anglais) avec un message toast de confirmation.
2. **Rechargement de la page (F5 / Cmd+R) :**
   - Rechargez la page : le script interroge automatiquement l'état auprès du Service Worker (`checkPushStatus()`).
   - **Résultat attendu :** Le bouton **ne se réinitialise plus** au libellé initial; il affiche immédiatement **`✓ Activé`** en vert dès le chargement.
3. **Bascule de langue :**
   - Cliquez sur `EN` en haut à droite : le bouton passe à **`✓ Enabled`** tout en conservant son style actif.
   - Cliquez sur `FR` : le bouton repasse à **`✓ Activé`**.
4. **Désactivation (Bascule) :**
   - Cliquez à nouveau sur le bouton **`✓ Activé`** : les notifications sont désactivées auprès du Service Worker, et le bouton redevient **`Activer la notification du fureteur`**.

---

### Étape F : Test de la notification de cercle avec le simulateur CLI
Cette procédure permet de tester en direct la réception de la notification Web Push lors du déblocage d'un cercle :

1. **Préparation dans le navigateur :**
   - Activez les notifications (bouton `✓ Activé`).
   - Saisissez un code postal (ex: `H2T 2N5`).
   - Choisissez un seuil de **3 amis proches** (ou 5 amis).
   - Cliquez sur **`Signer le pacte numérique`**.
   - Dans le modal de succès, cliquez sur **`Copier`** pour copier votre URL d'invitation privée :
     *(ex: `http://localhost:3000/#cercle=a1b2c3...&k=d4e5f6...`)*.
2. **Exécution du simulateur dans votre terminal :**
   - Lancez le script en lui passant l'URL d'invitation copiée :
     ```bash
     npm run circle:simulate -- "http://localhost:3000/#cercle=VOTRE_ID_HEX&k=VOTRE_CLE"
     ```
     *(ou directement : `node scripts/simulate-circle.js "VOTRE_URL_OU_ID"`)*
3. **Observation en temps réel :**
   - Le terminal affiche l'état actuel du cercle (`1 / 3` ou `1 / 5`).
   - Le script calcule automatiquement le nombre d'amis requis (ex: 2 amis manquants).
   - Chaque ami rejoint avec une barre de progression en temps réel :
     ```text
     [1/2] 👤 Ami rejoint ! Progression : [███████░░░] 2/3 (67%)
     [2/2] 👤 Ami rejoint ! Progression : [██████████] 3/3 (100%) — 🔓 SEUIL ATTEINT !
     🎉 SUCCÈS : MASSE CRITIQUE ATTEINTE !
     🔔 Le serveur a déclenché l'envoi de la notification Web Push...
     ```
4. **Réception de la notification :**
   - Une notification de votre système d'exploitation / fureteur s'affiche instantanément :
     `🎉 Pacte Numérique : Masse critique atteinte !`
     `Votre cercle de 3 amis a rejoint le pacte ! Il est temps de faire le saut ensemble vers les réseaux souverains.`
   - De plus, si l'onglet du pacte est ouvert au premier plan, un message toast de célébration apparaît immédiatement dans la page et la barre de progression passe à 100% en temps réel !

---

### Étape G : Persistance locale du cercle et tableau de bord en direct
1. **Persistance au rechargement :**
   - Dès que vous signez le pacte, votre cercle est sauvegardé localement (`localStorage`).
   - Même si vous rechargez la page ou fermez votre fureteur, le panneau **`Mon cercle d'action souverain`** s'affiche au-dessus du formulaire.
   - Il affiche :
     - Votre jauge de progression en direct (`X / 5 amis`).
     - Votre lien d'invitation avec bouton de copie en 1 clic.
     - L'état de vos notifications (avec bouton d'activation rapide).
     - Le bouton **`🔔 Tester mes notifications`** pour déclencher immédiatement une notification système et un carillon audio.
     - La commande CLI prête à être copiée.
2. **Synchronisation en direct (Polling & Push) :**
   - Lorsque des amis rejoignent votre cercle (ou lors d'un test avec `npm run circle:simulate`), le panneau se met à jour automatiquement toutes les 15 secondes sans recharger la page.
3. **Célébration à l'atteinte du seuil (100%) :**
   - Dès que le seuil de 5/5 est atteint :
     - Un carillon harmonique civique (Do-Mi-Sol-Do) retentit via la Web Audio API.
     - Une notification système est envoyée.
     - Une bannière de célébration persistante apparaît avec animation émeraude sur le widget.
4. **Diagnostic des notifications bureau sur macOS :**
   - Sur macOS (Sonoma, Sequoia, etc.), Google Chrome peut avoir l'autorisation Web accordée tout en étant bloqué au niveau du système d'exploitation :
     - **Vérification 1 :** *Réglages Système macOS > Notifications > Google Chrome* -> Activez "Autoriser les notifications" et les bannières.
     - **Vérification 2 :** Désactivez le mode "Ne pas déranger" ou "Concentration" dans la barre des menus de macOS.
     - **Vérification 3 :** Cliquez sur le bouton `🔔 Tester mes notifications` dans le widget de votre cercle pour tester la chaîne complète.
5. **Réinitialisation volontaire :**
   - Un bouton discret `Nouveau cercle / Réinitialiser` vous permet à tout moment d'effacer la progression locale pour créer un nouveau pacte.

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
  -d '{"postal_code":"12345"}' | jq .

# 4. Tester l'engagement et la création d'un cercle aveugle
curl -s -X POST http://localhost:3000/api/pact/commit \
  -H "Content-Type: application/json" \
  -d '{"postal_code":"H2T 2N5","blind_circle_id":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","target_count":3}' | jq .

# 5. Consulter l'état d'un cercle aveugle
curl -s http://localhost:3000/api/circle/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef | jq .

# 6. Rejoindre directement un cercle aveugle (incrémentation)
curl -s -X POST http://localhost:3000/api/circle/join \
  -H "Content-Type: application/json" \
  -d '{"blind_circle_id":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}' | jq .
```

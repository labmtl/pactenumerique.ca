# PacteNumérique.ca 🍁

Plateforme civique d'action collective et d'engagement conditionnel pour la souveraineté numérique au Canada. Permet aux citoyens canadiens de coordonner leur départ des réseaux sociaux de la Big Tech américaine vers des solutions souveraines (Fédiverse, Mastodon, Bluesky, Matrix) dès qu'une masse critique est atteinte au sein de leur cercle d'amis et de leur quartier.

---

## 🛡️ Principes Clés

1. **Confidentialité par conception (*Zero-Knowledge*) :**
   - Aucune cartographie du graphe social : la clé symétrique du cercle d'invitation est encodée dans le **fragment d'URL** (`#cercle=...&k=...`). Selon les spécifications du protocole HTTP, ce fragment n'est **jamais** transmis au serveur.
   - Le serveur enregistre uniquement des incréments sur des compteurs aveugles (*blind tokens*) dérivés cryptographiquement dans le fureteur du client avec la Web Crypto API (`SHA-256`).
   - Les courriels sont hachés avec un sel secret serveur (HMAC-SHA256) pour prévenir les doublons sans stocker d'adresses en clair.

2. **Territorialité canadienne (Région de Tri d'Acheminement - RTA / FSA) :**
   - Le code postal canadien complet (`A1A 1A1`) est validé côté client pour vérifier sa conformité, mais seuls les 3 premiers caractères (la RTA, ex: `H2T`, `G1K`, `K1A`) sont stockés sur le serveur pour garantir l'anonymat tout en mesurant la masse critique par quartier, ville et province.

3. **Notifications fureteur (*Web Push* RFC 8291/8292) :**
   - Grâce aux clés VAPID et à un Service Worker natif, les signataires reçoivent une notification discrète sur leur ordinateur ou téléphone dès que leur cercle d'amis a atteint son seuil pour effectuer la bascule ensemble (*The Leap*).

4. **Bilinguisme intégral :**
   - Français et Anglais intégrés nativement avec détection automatique et bascule instantanée.

5. **Hébergement Souverain chez WHC.ca :**
   - Conçu spécifiquement pour être hébergé sur les serveurs canadiens de **Web Hosting Canada (WHC.ca)** à Montréal et Vancouver, en conformité totale avec la Loi 25 (Québec) et la LPRPDE/PIPEDA.

---

## 🚀 Démarrage Rapide en Local

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Créez votre fichier `.env` à partir du modèle :
```bash
cp .env.example .env
```

Pour générer automatiquement une paire de clés VAPID pour les notifications fureteur :
```bash
npm run vapid:generate
```
Copiez les deux clés obtenues dans votre fichier `.env`.

### 3. Lancement des tests automatisés
Une suite complète de tests sans dépendance externe (utilisant le test runner natif de Node.js) valide la cryptographie, les codes postaux, la logique de masse critique et l'API :
```bash
npm test
```

### 4. Lancement du serveur en développement
```bash
npm run dev
```
Ouvrez votre fureteur sur [http://localhost:3000](http://localhost:3000).

*(Note : Si votre base MySQL n'est pas encore démarrée en local, l'application bascule automatiquement en mode simulation mémoire pour vous permettre de tester l'interface et les flux cryptographiques sans interruption).*

---

## 🍁 Déploiement chez Web Hosting Canada (WHC.ca)

### Étape 1 : Créer la base de données MySQL sur cPanel
1. Connectez-vous à votre cPanel WHC.ca.
2. Allez dans **Bases de données MySQL** (ou l'*Assistant bases de données MySQL*).
3. Créez une nouvelle base de données (ex: `votrenom_pacte`).
4. Créez un utilisateur MySQL avec un mot de passe sécurisé et associez-le à la base avec **Tous les privilèges**.

### Étape 2 : Configurer l'application Node.js sur cPanel
1. Dans cPanel, cliquez sur **Setup Node.js App** (Gestionnaire d'applications Node.js).
2. Cliquez sur **Create Application** :
   - **Node.js version :** 20.x ou 22.x
   - **Application mode :** `Production`
   - **Application root :** le dossier où vous téléversez les fichiers (ex: `pactenumerique.ca`)
   - **Application URL :** `pactenumerique.ca`
   - **Application startup file :** `src/server.js`
3. Cliquez sur **Create**.
4. Dans la section **Environment variables**, ajoutez vos accès MySQL :
   - `DB_HOST` = `localhost` (ou `127.0.0.1`)
   - `DB_PORT` = `3306`
   - `DB_NAME` = `votrenom_pacte`
   - `DB_USER` = `votrenom_utilisateur`
   - `DB_PASSWORD` = `votre_mot_de_passe`
   - `SERVER_SALT` = `une_longue_chaine_aleatoire_secrete`
   - `VAPID_PUBLIC_KEY` = votre clé publique VAPID
   - `VAPID_PRIVATE_KEY` = votre clé privée VAPID
   - `VAPID_SUBJECT` = `mailto:contact@pactenumerique.ca`

### Étape 3 : Installer les dépendances et initialiser les tables
Dans le terminal cPanel (ou via SSH) :
```bash
# Entrer dans l'environnement virtuel de l'application (affiché en haut de la page cPanel Node.js)
source /home/votrenom/nodevenv/pactenumerique.ca/20/bin/activate
cd /home/votrenom/pactenumerique.ca

# Installer les modules
npm install --production

# Créer automatiquement les tables MySQL
npm run db:init
```

### Étape 4 : Redémarrer l'application
Dans cPanel > **Setup Node.js App**, cliquez sur le bouton **Restart** de votre application.
Votre site est maintenant en ligne sur `https://pactenumerique.ca` !

---

## 📁 Structure du Projet

```
pactenumerique.ca/
├── public/
│   ├── index.html            # Interface responsive bilingue (FR/EN)
│   ├── css/
│   │   └── style.css         # Design system épuré, accessible, animations CSS
│   ├── js/
│   │   ├── app.js            # Contrôleur d'interface, i18n et jauges territoriales
│   │   ├── crypto.js         # Web Crypto API (clé de cercle, hachage aveugle, PoW)
│   │   ├── push.js           # Gestionnaire d'abonnement Web Push VAPID
│   │   └── sw.js             # Service Worker pour notifications fureteur
│   └── locales/
│       ├── fr.json           # Dictionnaire de traductions françaises
│       └── en.json           # Dictionnaire de traductions anglaises
├── src/
│   ├── server.js             # Serveur HTTP Node.js Express (compatible Phusion Passenger)
│   ├── routes/
│   │   ├── pact.js           # API de signature et incrément de cercle aveugle
│   │   └── stats.js          # API de statistiques territoriales et clé VAPID
│   ├── services/
│   │   ├── db.js             # Pool de connexions MySQL (mysql2/promise) avec fallback
│   │   ├── cryptoService.js  # Utilitaires de sécurité et anti-spam PoW
│   │   └── notifier.js       # Émetteur de notifications Web Push RFC 8291
│   ├── utils/
│   │   ├── postalCodes.js    # Validateur et extracteur de RTA (FSA) canadiennes
│   │   └── generateVapid.js  # Générateur de clés cryptographiques VAPID
│   └── db/
│       ├── schema.sql        # Définition des tables MySQL optimisées InnoDB
│       └── init.js           # Script de migration automatique
├── .env.example              # Gabarit des variables d'environnement
├── DESIGN.md                 # Architecture technique détaillée
├── package.json
└── README.md
```

---

## ⚖️ Licence

Projet civique et démocratique sous licence **MIT**.

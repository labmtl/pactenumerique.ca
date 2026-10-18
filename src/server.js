import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pactRoutes from './routes/pact.js';
import statsRoutes from './routes/stats.js';
import { initDatabase } from './services/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware de parsing
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

// En-têtes de sécurité de base
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Fichiers statiques (interface web, Service Worker, styles, scripts)
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    // Ne pas mettre en cache le Service Worker ni la page d'accueil
    if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Routes API
app.use('/api/pact', pactRoutes);
app.use('/api/circle', pactRoutes);
app.use('/api/stats', statsRoutes);

// Route de santé (Health check pour cPanel / monitoring)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'pactenumerique.ca'
  });
});

// Fallback 404 pour l'API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint API introuvable' });
});

// Routes de pages dédiées
app.get('/repertoire', (req, res) => {
  res.sendFile(path.join(publicDir, 'repertoire.html'));
});

app.get('/statistiques', (req, res) => {
  res.sendFile(path.join(publicDir, 'statistiques.html'));
});

// Fallback SPA pour les liens directs (ex: /join#...)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Démarrage du serveur et vérification des tables
async function startServer() {
  await initDatabase();
  app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` PacteNumérique.ca lancé avec succès`);
    console.log(` Port: ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` URL:  http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('[Serveur] Échec critique au démarrage:', err);
  process.exit(1);
});

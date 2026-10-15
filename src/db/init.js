import 'dotenv/config';
import { initDatabase } from '../services/db.js';

console.log('--- Initialisation des tables PostgreSQL pour pactenumerique.ca ---');
try {
  await initDatabase();
  console.log('--- Terminé avec succès ---');
  process.exit(0);
} catch (err) {
  console.error('--- Échec de l\'initialisation ---');
  process.exit(1);
}

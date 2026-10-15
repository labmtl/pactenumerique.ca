import 'dotenv/config';
import { initDatabase } from '../services/db.js';

console.log('--- Initialisation des tables MySQL pour pactenumerique.ca ---');
await initDatabase();
console.log('--- Terminé ---');
process.exit(0);

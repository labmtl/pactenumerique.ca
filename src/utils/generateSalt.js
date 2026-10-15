import { generateSalt } from '../services/cryptoService.js';

const salt = generateSalt(32);

console.log('--- Nouveau SERVER_SALT généré pour pactenumerique.ca ---');
console.log('');
console.log(`SERVER_SALT=${salt}`);
console.log('');
console.log('Copiez cette ligne dans votre fichier .env ou dans les variables d\'environnement cPanel');

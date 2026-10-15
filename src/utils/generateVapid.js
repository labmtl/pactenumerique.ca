import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('--- Nouvelles clés VAPID générées pour pactenumerique.ca ---');
console.log('');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('');
console.log('Copiez ces lignes dans votre fichier .env');

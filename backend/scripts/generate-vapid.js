const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('=============================================');
console.log('🚀 NEW VAPID KEYS GENERATED');
console.log('=============================================');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('=============================================');
console.log('⚠️ IMPORTANT: Copy these to your .env file.');
console.log('⚠️ WARNING: Once you deploy with these keys, DO NOT change them');
console.log('otherwise existing users will stop receiving notifications.');
console.log('=============================================');

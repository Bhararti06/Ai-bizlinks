const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('--- Diagnostic Report ---');
console.log('Current Directory:', __dirname);
console.log('.env exists:', fs.existsSync(path.join(__dirname, '.env')));
console.log('BASE_URL:', process.env.BASE_URL);
console.log('SUPER_ADMIN_EMAIL:', process.env.SUPER_ADMIN_EMAIL);

if (!process.env.BASE_URL) {
    console.log('ERROR: BASE_URL is undefined.');
    if (fs.existsSync(path.join(__dirname, '.env'))) {
        console.log('.env Content Snippet:', fs.readFileSync(path.join(__dirname, '.env'), 'utf8').substring(0, 100));
    }
}

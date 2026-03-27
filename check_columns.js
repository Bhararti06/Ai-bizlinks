require('dotenv').config();
const { pool } = require('./backend/config/database');
const fs = require('fs');

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '****' : 'MISSING');
console.log('DB_NAME:', process.env.DB_NAME);

async function run() {
    try {
        console.log('Attempting to query schema...');
        const [rows] = await pool.execute('SHOW COLUMNS FROM organizations');
        console.log('Success! Columns found:', rows.length);
        fs.writeFileSync('columns.json', JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('Error during execution:', error.message);
        fs.writeFileSync('error.txt', error.stack);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

run();

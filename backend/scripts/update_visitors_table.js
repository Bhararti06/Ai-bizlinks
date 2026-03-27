const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'community_portal_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function addColumns() {
    try {
        console.log('Adding columns to visitors table...');

        // Check if columns exist first (optional, but good practice)
        // We will just try to add them and catch error if they exist, or use IF NOT EXISTS if supported (MySQL doesn't support IF NOT EXISTS in ADD COLUMN directly in all versions comfortably, so separate try/catch is easier or just force it)

        // 1. company_name
        try {
            await pool.query(`ALTER TABLE visitors ADD COLUMN company_name VARCHAR(255) DEFAULT NULL`);
            console.log('Added company_name column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('company_name already exists');
            else throw err;
        }

        // 2. chapter
        try {
            await pool.query(`ALTER TABLE visitors ADD COLUMN chapter VARCHAR(100) DEFAULT NULL`);
            console.log('Added chapter column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('chapter already exists');
            else throw err;
        }

        // 3. payment_status
        try {
            await pool.query(`ALTER TABLE visitors ADD COLUMN payment_status ENUM('pending', 'completed') DEFAULT 'pending'`);
            console.log('Added payment_status column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('payment_status already exists');
            else throw err;
        }

        // 4. payment_confirmed
        try {
            await pool.query(`ALTER TABLE visitors ADD COLUMN payment_confirmed BOOLEAN DEFAULT FALSE`);
            console.log('Added payment_confirmed column');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') console.log('payment_confirmed already exists');
            else throw err;
        }

        console.log('Visitors table update complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

addColumns();

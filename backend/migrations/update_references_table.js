const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'community_portal_db_2'
});

async function migrate() {
    try {
        console.log('Adding missing columns to business_references...');

        // Check if columns exist first to avoid double-add errors (simple approach: just try add and catch or individual checks)
        // Better: ALTER TABLE ADD COLUMN IF NOT EXISTS (MariaDB 10.2+) but standard MySQL might not support IF NOT EXISTS in ALTER.
        // We will just run ALTER TABLE.

        const query = `
            ALTER TABLE business_references
            ADD COLUMN status ENUM('Open', 'Business Done', 'Closed') DEFAULT 'Open',
            ADD COLUMN referral_flag VARCHAR(50),
            ADD COLUMN referred_to VARCHAR(255);
        `;

        await pool.query(query);
        console.log('Migration successful: Added status, referral_flag, referred_to');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

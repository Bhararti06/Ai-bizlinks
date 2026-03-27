const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting migration: add contact_number to visitors...');
    try {
        try {
            await pool.execute('ALTER TABLE visitors ADD COLUMN contact_number VARCHAR(20)');
            console.log('✓ Added contact_number column');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ contact_number column already exists');
            } else {
                throw err;
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

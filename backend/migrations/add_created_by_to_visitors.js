const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting migration: Add created_by to visitors table...');
    try {
        // 1. Add created_by column
        try {
            await pool.execute('ALTER TABLE visitors ADD COLUMN created_by INT NULL');
            console.log('✓ Added created_by column');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ created_by column already exists');
            } else {
                throw err;
            }
        }

        // 2. Add foreign key
        try {
            await pool.execute('ALTER TABLE visitors ADD CONSTRAINT fk_visitors_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL');
            console.log('✓ Added foreign key constraint for created_by');
        } catch (err) {
            if (err.code === 'ER_DUP_CONSTRAINT_NAME' || err.code === 'ER_FK_DUP_NAME') {
                console.log('ℹ Foreign key constraint already exists');
            } else {
                console.warn('Warning: Could not add foreign key:', err.message);
            }
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting migration: Add business_done_amount to business_references...');
    try {
        // Add business_done_amount column
        try {
            await pool.execute('ALTER TABLE business_references ADD COLUMN business_done_amount DECIMAL(15, 2) DEFAULT 0.00 AFTER status');
            console.log('✓ Column "business_done_amount" added successfully');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ Column "business_done_amount" already exists, skipping.');
            } else {
                throw err;
            }
        }

        // Add updated_at column for tracking completion date
        try {
            await pool.execute('ALTER TABLE business_references ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            console.log('✓ Column "updated_at" added successfully');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ Column "updated_at" already exists, skipping.');
            } else {
                throw err;
            }
        }

        console.log('✨ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();

const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting migration: add payment columns to visitors table...');
    try {
        // Add payment_status column
        try {
            await pool.execute("ALTER TABLE visitors ADD COLUMN payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending'");
            console.log('✓ Added payment_status column');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ payment_status column already exists');
            } else {
                console.error('Error adding payment_status:', err.message);
            }
        }

        // Add payment_confirmed column
        try {
            await pool.execute('ALTER TABLE visitors ADD COLUMN payment_confirmed BOOLEAN DEFAULT FALSE');
            console.log('✓ Added payment_confirmed column');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ payment_confirmed column already exists');
            } else {
                console.error('Error adding payment_confirmed:', err.message);
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

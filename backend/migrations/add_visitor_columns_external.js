const { pool } = require('../config/database');

async function migrate() {
    console.log('Starting migration: prevent missing columns in visitors table...');
    try {
        // Add company_name column
        try {
            await pool.execute('ALTER TABLE visitors ADD COLUMN company_name VARCHAR(255)');
            console.log('✓ Added company_name column');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ company_name column already exists');
            } else {
                console.error('Error adding company_name:', err.message);
            }
        }

        // Add chapter column
        try {
            await pool.execute('ALTER TABLE visitors ADD COLUMN chapter VARCHAR(255)');
            console.log('✓ Added chapter column');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ chapter column already exists');
            } else {
                console.error('Error adding chapter:', err.message);
                throw err;
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

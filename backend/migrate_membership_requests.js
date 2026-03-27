const { pool } = require('./config/database');

async function migrate() {
    try {
        console.log('Starting migration: Updating users table for membership requests...');

        // 1. Add new columns
        const columnsQuery = `
      ALTER TABLE users 
      ADD COLUMN category_id INT NULL AFTER chapter,
      ADD COLUMN plan_id INT NULL AFTER category_id,
      ADD COLUMN referred_by_id INT NULL AFTER plan_id,
      ADD COLUMN referred_by_other VARCHAR(255) NULL AFTER referred_by_id
    `;

        try {
            await pool.query(columnsQuery);
            console.log('✓ Added category_id, plan_id, referred_by_id, referred_by_other columns');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('! Columns already exist, skipping...');
            } else {
                throw e;
            }
        }

        // 2. Update role ENUM
        const enumQuery = `
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'member', 'chapter_admin') NOT NULL DEFAULT 'member'
    `;
        await pool.query(enumQuery);
        console.log('✓ Updated role ENUM to include chapter_admin');

        console.log('✓ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();

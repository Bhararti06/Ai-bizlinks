const { pool } = require('../config/database');

const up = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Adding password_set column to users table...');

        // Add password_set column (default false)
        await connection.query(`
            ALTER TABLE users 
            ADD COLUMN password_set BOOLEAN DEFAULT FALSE AFTER password
        `);

        console.log('Updating existing approved users to password_set = true...');

        // Set password_set = true for all approved users (they already have passwords)
        await connection.query(`
            UPDATE users 
            SET password_set = TRUE 
            WHERE status = 'approved' AND password IS NOT NULL
        `);

        console.log('Migration 006_add_password_set_flag completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
};

const down = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Removing password_set column from users table...');

        await connection.query(`
            ALTER TABLE users 
            DROP COLUMN password_set
        `);

        console.log('Rollback 006_add_password_set_flag completed successfully');
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Run migration if executed directly
if (require.main === module) {
    up()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = { up, down };

const { pool } = require('../config/database');

async function up() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration: add_data_to_notifications');

        // Check if data column exists
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM notifications LIKE 'data'
        `);

        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE notifications
                ADD COLUMN data JSON NULL AFTER type
            `);
            console.log('Added data column to notifications table');
        } else {
            console.log('data column already exists in notifications table');
        }

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Execute if run directly
if (require.main === module) {
    up()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { up };

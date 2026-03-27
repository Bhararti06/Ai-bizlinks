const { pool } = require('../config/database');

async function up() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration: add_fields_to_meetings');

        // Check if mode column exists
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM meetings LIKE 'mode'
        `);

        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE meetings
                ADD COLUMN mode VARCHAR(50) DEFAULT 'Virtual' AFTER description,
                ADD COLUMN end_time DATETIME NULL AFTER meeting_date
            `);
            console.log('Added mode and end_time columns to meetings table');
        } else {
            console.log('mode column already exists in meetings table');
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

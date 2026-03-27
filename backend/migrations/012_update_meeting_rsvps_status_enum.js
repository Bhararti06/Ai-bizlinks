const { pool } = require('../config/database');

async function up() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration: update_meeting_rsvps_status_enum');

        // Check current ENUM values
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM meeting_rsvps LIKE 'status'
        `);

        const currentType = columns[0].Type;
        console.log('Current status type:', currentType);

        if (!currentType.includes("'accepted'")) {
            // Update the ENUM to include 'accepted'
            // We'll keep the existing values and add 'accepted'
            const newType = "ENUM('invited', 'attending', 'not_attending', 'maybe', 'accepted')";
            await connection.query(`
                ALTER TABLE meeting_rsvps
                MODIFY COLUMN status ${newType} NOT NULL DEFAULT 'invited'
            `);
            console.log('Updated status ENUM to include "accepted"');
        } else {
            console.log('"accepted" already exists in status ENUM');
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

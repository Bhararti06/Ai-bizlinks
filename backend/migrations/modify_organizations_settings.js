const { pool } = require('../config/database');

const up = async () => {
    try {
        console.log('Migrating: Modifying organizations table settings column to LONGTEXT');

        // Modify the column type
        await pool.execute(`
            ALTER TABLE organizations 
            MODIFY COLUMN settings LONGTEXT
        `);

        console.log('Migration successful: settings column is now LONGTEXT');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};

module.exports = { up };

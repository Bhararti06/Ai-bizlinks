const { pool } = require('../config/database');

async function updateReferenceStatusEnum() {
    try {
        console.log('Updating business_references status ENUM...');

        // Modify the ENUM to include 'In Progress'
        await pool.execute(`
            ALTER TABLE business_references 
            MODIFY COLUMN status ENUM('Open', 'In Progress', 'Business Done', 'Closed') DEFAULT 'Open'
        `);

        console.log('✅ Successfully updated status ENUM to include "In Progress"');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

updateReferenceStatusEnum();

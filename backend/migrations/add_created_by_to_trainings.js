const { pool } = require('../config/database');

async function addCreatedByToTrainings() {
    try {
        console.log('Adding created_by column to trainings table...');

        // Add created_by column
        const query = `
            ALTER TABLE trainings
            ADD COLUMN created_by INT AFTER organization_id,
            ADD CONSTRAINT fk_trainings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        `;

        await pool.execute(query);
        console.log('✓ Added created_by column successfully');

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column created_by already exists, skipping...');
        } else {
            console.error('Error adding created_by column:', error);
            process.exit(1);
        }
    }
}

// Run the migration
addCreatedByToTrainings()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

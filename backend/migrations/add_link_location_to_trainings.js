const { pool } = require('../config/database');

async function migrate() {
    try {
        console.log('Checking trainings table columns...');

        // Check if training_link exists
        const [columns] = await pool.execute("SHOW COLUMNS FROM trainings LIKE 'training_link'");

        if (columns.length === 0) {
            console.log('Adding training_link and training_location to trainings table...');
            const alterTableQuery = `
                ALTER TABLE trainings
                ADD COLUMN training_link VARCHAR(500) AFTER payment_link,
                ADD COLUMN training_location VARCHAR(500) AFTER training_link;
            `;
            await pool.execute(alterTableQuery);
            console.log('✓ Trainings table updated successfully');
        } else {
            console.log('Trainings table already has the link and location columns, skipping.');
        }

    } catch (error) {
        console.error('Error updating trainings table:', error);
        throw error;
    }
}

migrate()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

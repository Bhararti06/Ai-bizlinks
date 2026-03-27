const { pool } = require('../config/database');

async function createTrainingsTable() {
    try {
        console.log('Creating trainings table...');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS trainings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                organization_id INT NOT NULL,
                training_title VARCHAR(255) NOT NULL,
                trainer_name VARCHAR(255) NOT NULL,
                training_start_date DATE NOT NULL,
                training_end_date DATE NOT NULL,
                training_start_time TIME NOT NULL,
                training_end_time TIME NOT NULL,
                training_charges DECIMAL(10,2),
                registration_last_date DATE NOT NULL,
                payment_link VARCHAR(500),
                training_mode ENUM('Virtual', 'In-Person') NOT NULL,
                training_description TEXT,
                image_path VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await pool.execute(createTableQuery);
        console.log('✓ Trainings table created successfully');

    } catch (error) {
        console.error('Error creating trainings table:', error);
        throw error;
    }
}

// Run the migration
createTrainingsTable()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });

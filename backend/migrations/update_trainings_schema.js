const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'community_portal'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        console.log('Creating training_registrations table...');
        const createRegistrationsQuery = `
            CREATE TABLE IF NOT EXISTS training_registrations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                training_id INT NOT NULL,
                user_id INT NOT NULL,
                status VARCHAR(50) DEFAULT 'registered',
                payment_status VARCHAR(50) DEFAULT 'pending',
                transaction_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_registration (training_id, user_id)
            );
        `;
        await connection.execute(createRegistrationsQuery);
        console.log('training_registrations table created.');
        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

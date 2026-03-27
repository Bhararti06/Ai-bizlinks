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

        // 1. Add new columns to events table
        console.log('Updating events table...');
        const alterEventsQuery = `
            ALTER TABLE events
            ADD COLUMN organizer_name VARCHAR(255) AFTER created_by,
            ADD COLUMN event_end_date DATETIME AFTER event_date,
            ADD COLUMN event_time_in TIME AFTER event_end_date,
            ADD COLUMN event_time_out TIME AFTER event_time_in,
            ADD COLUMN event_charges DECIMAL(10, 2) DEFAULT 0.00,
            ADD COLUMN registration_cutoff_date DATETIME,
            ADD COLUMN event_mode ENUM('In-Person', 'Virtual') DEFAULT 'In-Person',
            ADD COLUMN image_path VARCHAR(255),
            ADD COLUMN payment_link VARCHAR(255);
        `;

        // check if column exists first to avoid error on multiple runs (basic check)
        const [columns] = await connection.execute("SHOW COLUMNS FROM events LIKE 'organizer_name'");
        if (columns.length === 0) {
            await connection.execute(alterEventsQuery);
            console.log('Events table updated.');
        } else {
            console.log('Events table already updated, skipping ALTER.');
        }


        // 2. Create event_registrations table
        console.log('Creating event_registrations table...');
        const createRegistrationsQuery = `
            CREATE TABLE IF NOT EXISTS event_registrations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                event_id INT NOT NULL,
                user_id INT NOT NULL,
                status VARCHAR(50) DEFAULT 'registered',
                payment_status VARCHAR(50) DEFAULT 'pending',
                transaction_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_registration (event_id, user_id)
            );
        `;
        await connection.execute(createRegistrationsQuery);
        console.log('event_registrations table created.');

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

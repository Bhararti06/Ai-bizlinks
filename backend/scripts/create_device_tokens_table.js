require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function createTable() {
    console.log('Connecting to database...');
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Creating device_tokens table...');
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS device_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                organization_id INT NOT NULL,
                endpoint VARCHAR(512) NOT NULL,
                subscription JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_endpoint (user_id, endpoint),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;

        await pool.execute(createTableQuery);

        console.log('device_tokens table checked/created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createTable();

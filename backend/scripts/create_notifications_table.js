const { pool } = require('../config/database');

async function createTable() {
    try {
        const query = `
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        organization_id INT NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_org_id (organization_id),
        INDEX idx_is_read (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

        await pool.execute(query);
        console.log('Successfully created notifications table.');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        process.exit();
    }
}

createTable();

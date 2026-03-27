const { pool } = require('../config/database');

const createTable = async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                organization_id INT NOT NULL,
                message VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            )
        `);
        console.log('Notifications table created successfully');

        await pool.execute(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)
        `).catch(err => console.log('Index might already exist or error:', err.message));

        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
};

createTable();

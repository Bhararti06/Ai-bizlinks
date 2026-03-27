const { pool } = require('../config/database');

async function up() {
    try {
        console.log('Creating deactivation_requests table...');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS deactivation_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                organization_id INT NOT NULL,
                user_id INT NOT NULL COMMENT 'Member to be deactivated',
                requested_by INT NOT NULL COMMENT 'Chapter Admin who requested',
                reason TEXT,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                reviewed_by INT NULL COMMENT 'Org Admin who reviewed',
                reviewed_at TIMESTAMP NULL,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_org_status (organization_id, status),
                INDEX idx_user (user_id),
                INDEX idx_requested_by (requested_by)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log('✅ deactivation_requests table created successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

async function down() {
    try {
        console.log('Dropping deactivation_requests table...');
        await pool.execute('DROP TABLE IF EXISTS deactivation_requests');
        console.log('✅ deactivation_requests table dropped');
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };

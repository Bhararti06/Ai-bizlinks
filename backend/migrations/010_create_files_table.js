const { pool } = require('../config/database');

async function up() {
    console.log('Starting migration: create_files_table');
    const query = `
    CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;
    await pool.execute(query);
    console.log('Created files table');
}

async function down() {
    console.log('Starting migration rollback: create_files_table');
    const query = 'DROP TABLE IF EXISTS files';
    await pool.execute(query);
    console.log('Dropped files table');
}

if (require.main === module) {
    up().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { up, down };

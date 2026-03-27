const { pool } = require('./config/database');

async function migrate() {
    try {
        console.log('Creating chapters table...');
        const query = `
      CREATE TABLE IF NOT EXISTS chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        street_address TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        zip_code VARCHAR(20),
        email_id VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        UNIQUE KEY unique_org_chapter (organization_id, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        await pool.query(query);
        console.log('✓ chapters table created or already exists');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

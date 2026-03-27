const { pool } = require('./config/database');

async function fixDatabase() {
    console.log('Starting database fix...');
    try {
        // 0. Cleanup orphaned organizations
        console.log('Cleaning up partial registrations...');
        try {
            await pool.execute('DELETE FROM organizations WHERE name IN ("Tech M", "Infosys")');
            console.log('✓ Cleaned up "Tech M" and "Infosys" records if they existed');
        } catch (err) {
            console.log('ℹ Cleanup skipped or not needed.');
        }

        // 1. Add chapter column to users table
        console.log('Adding "chapter" column to "users" table...');
        try {
            await pool.execute('ALTER TABLE users ADD COLUMN chapter VARCHAR(255) AFTER status');
            console.log('✓ Column "chapter" added successfully');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ Column "chapter" already exists skipping.');
            } else {
                console.warn('⚠ Could not add "chapter" column:', err.message);
            }
        }

        // 2. Create business_references table
        console.log('Creating "business_references" table...');
        const createRefsQuery = `
            CREATE TABLE IF NOT EXISTS business_references (
                id INT AUTO_INCREMENT PRIMARY KEY,
                organization_id INT NOT NULL,
                user_id INT NOT NULL,
                reference_name VARCHAR(255) NOT NULL,
                ref_organization_name VARCHAR(255),
                contact_email VARCHAR(255),
                contact_phone VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createRefsQuery);
        console.log('✓ Table "business_references" ready');

        // 3. Create events table
        console.log('Creating "events" table...');
        const createEventsQuery = `
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                organization_id INT NOT NULL,
                created_by INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                event_date DATETIME NOT NULL,
                location VARCHAR(255),
                event_link VARCHAR(500),
                chapter VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.execute(createEventsQuery);
        console.log('✓ Table "events" ready');

        console.log('\n✨ Database fix completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database fix failed:', error.message);
        process.exit(1);
    }
}

fixDatabase();

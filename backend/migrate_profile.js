const { pool } = require('./config/database');

async function migrate() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        const hasProfileImage = columns.some(col => col.Field === 'profile_image');

        if (!hasProfileImage) {
            console.log('Adding profile_image column to users table...');
            await pool.query('ALTER TABLE users ADD COLUMN profile_image VARCHAR(500) DEFAULT NULL AFTER chapter');
            console.log('✓ profile_image column added');
        } else {
            console.log('profile_image column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();

const { pool } = require('../config/database');

async function up() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration: add_image_to_posts');

        // Check if column exists
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM posts LIKE 'image_path'
        `);

        if (columns.length === 0) {
            await connection.query(`
                ALTER TABLE posts
                ADD COLUMN image_path VARCHAR(255) NULL AFTER description
            `);
            console.log('Added image_path column to posts table');
        } else {
            console.log('image_path column already exists in posts table');
        }

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Execute if run directly
if (require.main === module) {
    up()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { up };

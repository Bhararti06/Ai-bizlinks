const { pool } = require('../config/database');

async function up() {
    console.log('Adding reaction_type column to post_comment_likes...');

    // Add reaction_type column with default 'like' for existing records
    await pool.execute(`
        ALTER TABLE post_comment_likes 
        ADD COLUMN reaction_type ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry') 
        NOT NULL DEFAULT 'like'
        AFTER user_id
    `);

    console.log('✓ Added reaction_type column to post_comment_likes');
}

async function down() {
    console.log('Removing reaction_type column from post_comment_likes...');

    await pool.execute(`
        ALTER TABLE post_comment_likes 
        DROP COLUMN reaction_type
    `);

    console.log('✓ Removed reaction_type column from post_comment_likes');
}

module.exports = { up, down };

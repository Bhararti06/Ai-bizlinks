const { pool } = require('./config/database');

async function fixCharsets() {
    try {
        console.log('Fixing character sets to support emojis (utf8mb4)...');

        const tables = ['notifications', 'posts', 'users', 'post_comments', 'organizations'];

        for (const table of tables) {
            console.log(`- Converting table: ${table}`);
            await pool.execute(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        }

        console.log('\nSuccess! All tables converted to utf8mb4.');
        process.exit(0);
    } catch (err) {
        console.error('FAILED to fix charsets:', err);
        process.exit(1);
    }
}

fixCharsets();

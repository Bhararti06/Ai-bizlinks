const { pool } = require('./config/database');
require('dotenv').config();

async function checkChapters() {
    try {
        console.log('--- Chapter Check ---');

        const [chapters] = await pool.execute('SELECT organization_id, COUNT(*) as count FROM chapters GROUP BY organization_id');
        console.table(chapters);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkChapters();

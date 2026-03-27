const { pool } = require('./backend/config/database');
require('dotenv').config({ path: './backend/.env' });

async function check() {
    try {
        const [rows] = await pool.execute('SELECT id, name, organization_id, status FROM users WHERE id = 24');
        console.log('User 24:', rows);

        const [allUsers] = await pool.execute('SELECT id, name, organization_id, status FROM users ORDER BY id DESC LIMIT 5');
        console.log('Recent Users:', allUsers);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();

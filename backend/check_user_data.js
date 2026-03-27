const { pool } = require('./config/database');
require('dotenv').config();

async function checkSpecificUser() {
    try {
        console.log('--- Finding Pratiksha ---');

        const [users] = await pool.execute(`
            SELECT id, name, email, role, organization_id, status 
            FROM users 
            WHERE name LIKE '%Pratiksha%' OR email LIKE '%pratiksha%'
        `);

        console.table(users);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSpecificUser();

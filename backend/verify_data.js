const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyData() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'community_portal',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log('--- Verifying Data ---');

        // 1. Get all users
        const [users] = await pool.execute("SELECT id, name, email, role, status, organization_id FROM users WHERE name LIKE '%Pratiksha%'");
        console.log(`Total Users with name 'Pratiksha': ${users.length}`);
        console.table(users.map(u => ({ id: u.id, name: u.name, email: u.email, org: u.organization_id })));

        // 2. Get organizations
        const [orgs] = await pool.execute('SELECT id, name FROM organizations');
        console.log(`Total Organizations: ${orgs.length}`);
        console.table(orgs);

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyData();

const { pool } = require('./config/database');

async function checkUsers() {
    try {
        const [rows] = await pool.execute(`
            SELECT id, name, email, organization_id, status, role
            FROM users 
            WHERE id IN (23, 29)
            ORDER BY id
        `);

        console.log('=== USER COMPARISON ===');
        rows.forEach(user => {
            console.log(`\nUser ID: ${user.id}`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Organization ID: ${user.organization_id}`);
            console.log(`Status: ${user.status}`);
            console.log(`Role: ${user.role}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();

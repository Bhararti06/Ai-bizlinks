const { pool } = require('./config/database');

async function checkSuperAdmin() {
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', ['superadmin@bizlinks.in']);
        if (rows.length > 0) {
            console.log('SuperAdmin user FOUND:', rows[0]);
        } else {
            console.log('SuperAdmin user NOT FOUND');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error checking superadmin:', error);
        process.exit(1);
    }
}

checkSuperAdmin();

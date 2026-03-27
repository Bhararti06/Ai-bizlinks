const mysql = require('mysql2/promise');
require('dotenv').config();

const checkSuperAdmin = async () => {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await pool.execute('SELECT id, name, email, role, status FROM users WHERE email = ?', ['superadmin@bizlinks.in']);
        console.log('Super Admin User Record:', JSON.stringify(rows, null, 2));

        if (rows.length === 0) {
            console.log('No user found with email superadmin@bizlinks.in');
        }

        await pool.end();
    } catch (error) {
        console.error('Error checking user:', error);
    }
};

checkSuperAdmin();

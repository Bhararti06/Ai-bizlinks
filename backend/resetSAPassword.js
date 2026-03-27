const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const resetPassword = async () => {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const newPassword = 'SuperAdmin1';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const [result] = await pool.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'superadmin@bizlinks.in']
        );

        if (result.affectedRows > 0) {
            console.log('Successfully reset password for superadmin@bizlinks.in to SuperAdmin1');
        } else {
            console.log('Failed to reset password. User not found?');
        }

        await pool.end();
    } catch (error) {
        console.error('Error resetting password:', error);
    }
};

resetPassword();

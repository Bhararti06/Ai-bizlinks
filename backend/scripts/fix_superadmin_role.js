
const { pool } = require('../config/database');

async function fixSuperAdminRole() {
    console.log('Fixing Super Admin role...');
    const email = 'superadmin@bizlinks.in';

    try {
        // Update role to admin (or super_admin if we want a separate role)
        const [result] = await pool.execute(
            'UPDATE users SET role = ? WHERE email = ?',
            ['admin', email]
        );

        if (result.affectedRows > 0) {
            console.log('✓ Role updated successfully');
        } else {
            console.log('⚠ User not found');
        }

        // Verify
        const [rows] = await pool.execute('SELECT id, email, role, status FROM users WHERE email = ?', [email]);
        console.log('Updated User Details:', rows[0]);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixSuperAdminRole();

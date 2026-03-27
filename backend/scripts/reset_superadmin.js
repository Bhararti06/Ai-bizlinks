
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function resetSuperAdmin() {
    console.log('Resetting Super Admin password...');
    const email = 'superadmin@bizlinks.in';
    const password = 'SuperAdmin1';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update password and ensure status is approved
        const [result] = await pool.execute(
            'UPDATE users SET password = ?, status = "approved" WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows > 0) {
            console.log('✓ Password updated successfully for', email);
        } else {
            console.log('⚠ User not found. Attempting to create...');
            // If not found, we call the setup script logic or just fail?
            // Let's just report it. The previous log said it existed.
            console.log('User with email', email, 'does not exist in the table.');
        }

        // Verify the user details
        const [rows] = await pool.execute('SELECT id, email, role, status FROM users WHERE email = ?', [email]);
        console.log('Current User Details:', rows[0]);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

resetSuperAdmin();

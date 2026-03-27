const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetSuperAdminPassword() {
    try {
        const hashedPassword = await bcrypt.hash('SuperAdmin1', 10);
        console.log('Generated hash:', hashedPassword);

        const [result] = await pool.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'superadmin@bizlinks.in']
        );

        if (result.affectedRows > 0) {
            console.log('SuperAdmin password reset to "SuperAdmin1" successfully.');
        } else {
            console.log('SuperAdmin user not found for password reset.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
}

resetSuperAdminPassword();

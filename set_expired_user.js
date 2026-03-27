const { pool } = require('./backend/config/database');

async function setExpiry() {
    try {
        // Set member with ID 3 (usually a test member) to expired
        const userId = 3;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        console.log(`Setting user ${userId} renewal date to ${dateStr}...`);

        await pool.execute(
            'UPDATE users SET membership_renewal_date = ?, status = "approved" WHERE id = ?',
            [dateStr, userId]
        );

        console.log('SUCCESS: User is now expired but approved.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

setExpiry();

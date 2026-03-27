const { pool } = require('./backend/config/database');

async function checkNotifications() {
    try {
        const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
        console.log('Recent Notifications:', JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkNotifications();

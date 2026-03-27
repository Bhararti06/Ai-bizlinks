const { pool } = require('./config/database');

async function checkNotifications() {
    try {
        // Check recent notifications
        const [notifications] = await pool.execute(
            'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10'
        );

        console.log('\n=== Recent Notifications ===');
        console.log(`Total notifications: ${notifications.length}`);

        if (notifications.length > 0) {
            notifications.forEach((notif, index) => {
                console.log(`\n${index + 1}. ID: ${notif.id}`);
                console.log(`   User ID: ${notif.user_id}`);
                console.log(`   Type: ${notif.type}`);
                console.log(`   Message: ${notif.message}`);
                console.log(`   Created: ${notif.created_at}`);
                console.log(`   Read: ${notif.is_read}`);
            });
        } else {
            console.log('No notifications found in database!');
        }

        // Check notification types
        const [types] = await pool.execute(
            'SELECT type, COUNT(*) as count FROM notifications GROUP BY type'
        );

        console.log('\n=== Notification Types ===');
        types.forEach(t => {
            console.log(`${t.type}: ${t.count}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkNotifications();

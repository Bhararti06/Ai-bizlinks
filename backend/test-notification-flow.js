const { pool } = require('./config/database');

async function testNotificationFlow() {
    try {
        console.log('\n=== Testing Notification System ===\n');

        // Get all users
        const [users] = await pool.execute('SELECT id, name, email FROM users LIMIT 5');
        console.log('Available Users:');
        users.forEach(u => console.log(`  - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`));

        // Get recent posts
        const [posts] = await pool.execute('SELECT id, user_id, title, description FROM posts ORDER BY created_at DESC LIMIT 3');
        console.log('\nRecent Posts:');
        posts.forEach(p => console.log(`  - ID: ${p.id}, Author ID: ${p.user_id}, Title: ${p.title || p.description?.substring(0, 30)}`));

        // Get post likes
        const [likes] = await pool.execute(`
            SELECT pl.*, p.user_id as post_author_id, p.title as post_title 
            FROM post_likes pl 
            JOIN posts p ON pl.post_id = p.id 
            ORDER BY pl.created_at DESC LIMIT 5
        `);
        console.log('\nRecent Post Likes:');
        likes.forEach(l => console.log(`  - Post ${l.post_id} liked by User ${l.user_id}, Post Author: ${l.post_author_id}`));

        // Get notifications for each user
        console.log('\n=== Notifications by User ===');
        for (const user of users) {
            const [notifs] = await pool.execute(
                'SELECT id, type, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
                [user.id]
            );
            console.log(`\nUser ${user.id} (${user.name}):`);
            if (notifs.length === 0) {
                console.log('  No notifications');
            } else {
                notifs.forEach(n => console.log(`  - [${n.type}] ${n.message.substring(0, 50)}...`));
            }
        }

        // Check if post_like notifications exist
        const [postLikeNotifs] = await pool.execute(
            "SELECT * FROM notifications WHERE type = 'post_like' ORDER BY created_at DESC LIMIT 3"
        );
        console.log('\n=== Post Like Notifications ===');
        if (postLikeNotifs.length === 0) {
            console.log('❌ NO POST_LIKE NOTIFICATIONS FOUND!');
            console.log('This means notifications are NOT being created when posts are liked.');
        } else {
            console.log(`✅ Found ${postLikeNotifs.length} post_like notifications`);
            postLikeNotifs.forEach(n => {
                console.log(`  - User ${n.user_id}: ${n.message}`);
                console.log(`    Data: ${n.data}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testNotificationFlow();

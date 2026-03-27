const { pool } = require('./config/database');

async function testLike() {
    try {
        console.log('Testing Like Notification Creation...');

        // Simulating toggleLike logic for Post 22 (Author 37) liked by User 24
        const postId = 22;
        const userId = 24;
        const organizationId = 18;
        const postAuthorId = 37;

        const Post = require('./models/Post');
        const Notification = require('./models/Notification');
        const User = require('./models/User');

        const post = await Post.findByIdAndOrganization(postId, organizationId);
        if (!post) throw new Error('Post not found');

        const actor = await User.findById(userId);
        const actorName = actor ? (actor.name || actor.first_name) : 'Someone';
        const postTitle = post.title || 'your post';

        console.log(`Checking for existing notifications for post ${postId}...`);
        const [existingNotifs] = await pool.execute(
            `SELECT id, data FROM notifications 
             WHERE user_id = ? 
             AND type = 'post_like' 
             AND JSON_EXTRACT(data, '$.postId') = ?
             AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
             ORDER BY created_at DESC 
             LIMIT 1`,
            [postAuthorId, postId]
        );

        console.log(`Found ${existingNotifs.length} existing notifications.`);

        if (existingNotifs.length > 0) {
            const existingNotif = existingNotifs[0];
            const existingData = typeof existingNotif.data === 'string' ? JSON.parse(existingNotif.data) : existingNotif.data;
            console.log('Parsed existing data:', existingData);
        } else {
            console.log('Creating new notification...');
            const notifId = await Notification.create(
                postAuthorId,
                organizationId,
                `${actorName} liked your post: ${postTitle}`,
                'post_like',
                {
                    postId: postId,
                    likers: [{ id: userId, name: actorName, image: null }],
                    postTitle: postTitle
                }
            );
            console.log(`Created notification with ID: ${notifId}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
}

testLike();

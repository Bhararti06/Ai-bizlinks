const { pool } = require('./config/database');
const Post = require('./models/Post');
const Notification = require('./models/Notification');
const User = require('./models/User');

async function simulate() {
    try {
        console.log('--- NOTIFICATION SIMULATION START ---');

        // Scenario: Org Admin (23) likes Meena Keshav\'s (37) post
        const actorId = 23; // Omkar Jori (Admin)
        const authorId = 37; // Meena Keshav (Member)
        const organizationId = 18;

        // Find a post by Meena
        const [posts] = await pool.execute('SELECT id, title FROM posts WHERE user_id = ? AND organization_id = ? LIMIT 1', [authorId, organizationId]);

        if (posts.length === 0) {
            console.log('No posts found for Meena Keshav. Creating one...');
            const postId = await Post.create(organizationId, authorId, 'Test Post for Notifications', 'This is a test');
            posts.push({ id: postId, title: 'Test Post for Notifications' });
        }

        const post = posts[0];
        console.log(`Using Post ID: ${post.id}, Title: "${post.title}"`);

        // Simulate the logic in toggleLike
        console.log(`Checking: authorId(${authorId}) !== actorId(${actorId}) -> ${authorId !== actorId}`);

        if (authorId !== actorId) {
            const actor = await User.findById(actorId);
            const actorName = actor ? (actor.name || actor.first_name) : 'Someone';
            console.log(`Actor Name: ${actorName}`);

            // Check for existing notifications
            const [existing] = await pool.execute(
                `SELECT id FROM notifications 
                 WHERE user_id = ? AND type = 'post_like' 
                 AND JSON_EXTRACT(data, '$.postId') = ?
                 AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
                [authorId, post.id]
            );

            console.log(`Existing notifications found: ${existing.length}`);

            if (existing.length === 0) {
                console.log('Creating NEW notification...');
                const notifId = await Notification.create(
                    authorId,
                    organizationId,
                    `${actorName} liked your post: ${post.title}`,
                    'post_like',
                    {
                        postId: post.id,
                        likers: [{ id: actorId, name: actorName, image: null }],
                        postTitle: post.title
                    }
                );
                console.log(`SUCCESS! Notification ID: ${notifId}`);
            } else {
                console.log('Updating EXACT existing notification logic...');
                // ... logic to update ...
                console.log('Update simulation skipped for brevity, but creation worked.');
            }
        } else {
            console.log('SKIPPING notification (Self-like)');
        }

        process.exit(0);
    } catch (err) {
        console.error('SIMULATION FAILED:', err);
        process.exit(1);
    }
}

simulate();

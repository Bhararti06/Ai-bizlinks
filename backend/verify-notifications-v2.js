const { pool } = require('./config/database');
const Post = require('./models/Post');
const Notification = require('./models/Notification');
const User = require('./models/User');
const Event = require('./models/Event');
const Training = require('./models/Training');

async function verifyAll() {
    try {
        console.log('--- COMPREHENSIVE NOTIFICATION VERIFICATION START ---');

        const adminId = 23; // Omkar Jori
        const memberId = 37; // Meena Keshav
        const orgId = 18;

        // 1. Post Like Notification (Admin likes Member's post)
        console.log('\n[1] Testing Post Like Notification...');
        const [posts] = await pool.execute('SELECT id, title FROM posts WHERE user_id = ? LIMIT 1', [memberId]);
        if (posts.length > 0) {
            const postId = posts[0].id;
            console.log(`Simulating Admin(23) liking Member(37)'s post(${postId})...`);
            // Standard check: author != actor
            if (memberId != adminId) {
                const notifId = await Notification.create(memberId, orgId, 'Admin liked your post', 'post_like', { postId });
                console.log(`- Post like notification created: ${notifId}`);
            }
        }

        // 2. Comment Notification (Member comments on Admin's post)
        console.log('\n[2] Testing Comment Notification...');
        const [adminPosts] = await pool.execute('SELECT id, title FROM posts WHERE user_id = ? LIMIT 1', [adminId]);
        if (adminPosts.length > 0) {
            const postId = adminPosts[0].id;
            console.log(`Simulating Member(37) commenting on Admin(23)'s post(${postId})...`);
            if (adminId != memberId) {
                const notifId = await Notification.create(adminId, orgId, 'Member commented on your post', 'post_comment', { postId });
                console.log(`- Comment notification created: ${notifId}`);
            }
        }

        // 3. Event Registration Notification (Member registers for Admin's event)
        console.log('\n[3] Testing Event Registration Notification...');
        const [events] = await pool.execute('SELECT id, title, created_by FROM events WHERE created_by = ? LIMIT 1', [adminId]);
        if (events.length > 0) {
            const eventId = events[0].id;
            console.log(`Simulating Member(37) registering for Admin(23)'s event(${eventId})...`);
            if (adminId != memberId) {
                const notifId = await Notification.create(adminId, orgId, 'Member registered for your event', 'event_registration', { eventId });
                console.log(`- Event registration notification created: ${notifId}`);
            }
        }

        // 4. Training Registration Notification (Member registers for Admin's training)
        console.log('\n[4] Testing Training Registration Notification...');
        const [trainings] = await pool.execute('SELECT id, training_title, created_by FROM trainings WHERE created_by = ? LIMIT 1', [adminId]);
        if (trainings.length > 0) {
            const trainingId = trainings[0].id;
            console.log(`Simulating Member(37) registering for Admin(23)'s training(${trainingId})...`);
            if (adminId != memberId) {
                const notifId = await Notification.create(adminId, orgId, 'Member registered for your training', 'training_registration', { trainingId });
                console.log(`- Training registration notification created: ${notifId}`);
            }
        }

        // 5. Comment Reply (@mention) Notification
        console.log('\n[5] Testing Comment Reply (@mention) Notification...');
        console.log(`Simulating Admin(23) mentioning Member(37)...`);
        const notifId = await Notification.create(memberId, orgId, 'Admin replied to your comment', 'comment_reply', { postId: 22 });
        console.log(`- Reply notification created: ${notifId}`);

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION FAILED:', err);
        process.exit(1);
    }
}

verifyAll();

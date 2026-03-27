const { pool } = require('./config/database');
const Notification = require('./models/Notification');
const User = require('./models/User');

async function verifyMention() {
    try {
        console.log('--- ROBUST MENTION VERIFICATION START ---');

        const actorId = 33; // Tanvi Singh
        const mentionedName = 'Mahesh Kale';
        const organizationId = 18;
        const comment = `@Mahesh Kale yeah! This is a test.`;

        console.log(`Simulating comment: "${comment}"`);

        // --- LOGIC FROM postController.js ---
        const mentionRegex = /@([A-Za-z0-9\s]+)/g;
        const matches = [...comment.matchAll(mentionRegex)];

        console.log(`Found ${matches.length} potential matches.`);

        if (matches.length > 0) {
            const notifiedUsers = new Set();
            for (const match of matches) {
                const fullMatchString = match[1].trim();
                console.log(`Full match string: "${fullMatchString}"`);

                const words = fullMatchString.split(/\s+/);
                let foundUser = null;

                for (let i = Math.min(words.length, 4); i > 0; i--) {
                    const potentialName = words.slice(0, i).join(' ');
                    console.log(`Trying potential name: "${potentialName}"`);

                    const [users] = await pool.execute(
                        `SELECT id, name FROM users 
                         WHERE organization_id = ? 
                         AND (name = ? OR CONCAT(first_name, ' ', last_name) = ?)
                         AND id != ?
                         LIMIT 1`,
                        [organizationId, potentialName, potentialName, actorId]
                    );

                    if (users.length > 0) {
                        foundUser = users[0];
                        console.log(`MATCH FOUND: ${foundUser.name} (ID: ${foundUser.id})`);
                        break;
                    }
                }

                if (foundUser && !notifiedUsers.has(foundUser.id)) {
                    notifiedUsers.add(foundUser.id);
                    console.log(`Creating notification for User ID: ${foundUser.id}`);
                    const notifId = await Notification.create(
                        foundUser.id,
                        organizationId,
                        `Tanvi Singh mentioned you in a comment`,
                        'comment_reply',
                        { postId: 22, comment: comment }
                    );
                    console.log(`SUCCESS! Notification ID: ${notifId}`);
                } else if (!foundUser) {
                    console.log('No user found for this mention.');
                }
            }
        }

        console.log('\n--- VERIFICATION FINISHED ---');
        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION FAILED:', err);
        process.exit(1);
    }
}

verifyMention();

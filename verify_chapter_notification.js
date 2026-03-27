const { pool } = require('./backend/config/database');
const User = require('./backend/models/User');
const Notification = require('./backend/models/Notification');

async function verifyChapterNotification() {
    console.log('--- VERIFYING CHAPTER NOTIFICATION LOGIC ---');
    try {
        // 1. Find a chapter admin and their chapter
        const [admins] = await pool.execute(
            'SELECT id, organization_id, chapter FROM users WHERE role = "chapter_admin" AND status = "approved" LIMIT 1'
        );

        if (admins.length === 0) {
            console.error('No approved chapter admins found to test with.');
            return;
        }

        const admin = admins[0];
        console.log(`Using Test Admin: ID=${admin.id}, Org=${admin.organization_id}, Chapter=${admin.chapter}`);

        // 2. Find a pending user from the same organization or create one
        let pendingUser;
        const [pendingUsers] = await pool.execute(
            'SELECT id FROM users WHERE organization_id = ? AND status = "pending" LIMIT 1',
            [admin.organization_id]
        );

        if (pendingUsers.length === 0) {
            console.log('No pending users found. Creating a temporary test user...');
            const [result] = await pool.execute(
                'INSERT INTO users (organization_id, name, email, password, status, role) VALUES (?, ?, ?, ?, ?, ?)',
                [admin.organization_id, 'Temp Pending User', `temp_${Date.now()}@example.com`, 'password123', 'pending', 'member']
            );
            pendingUser = { id: result.insertId };
            console.log(`Created Temp Pending User: ID=${pendingUser.id}`);
        } else {
            pendingUser = pendingUsers[0];
            console.log(`Using Existing Test Pending User: ID=${pendingUser.id}`);
        }

        // 3. Clear existing notifications for this admin to avoid confusion
        await pool.execute('DELETE FROM notifications WHERE user_id = ?', [admin.id]);
        console.log('Cleared existing notifications for test admin.');

        // 4. Simulate Approval via Controller Logic (Manual update to trigger)
        console.log(`Simulating approval for User ${pendingUser.id} into Chapter "${admin.chapter}"...`);

        // This simulates what userController.js does
        const mockData = {
            name: 'Test Approved Member',
            mobile: '1234567890',
            chapter: admin.chapter,
            categoryId: 1,
            planId: 1,
            referredById: null,
            referredByOther: null
        };

        const success = await User.updateApprovalDetails(pendingUser.id, admin.organization_id, mockData);
        if (success) {
            console.log('Successfully updated user approval details.');

            // Send the notification
            await Notification.notifyChapterAdmins(
                admin.organization_id,
                admin.chapter,
                `New member added to your chapter: ${mockData.name}`,
                'member',
                { path: '/admin/users', name: mockData.name }
            );
            console.log('Sent chapter admin notification.');

            // 5. Verify notification exists for the admin
            const [notifs] = await pool.execute(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
                [admin.id]
            );

            if (notifs.length > 0) {
                const notif = notifs[0];
                console.log('SUCCESS: Notification found for Chapter Admin!');
                console.log('Message:', notif.message);
                console.log('Data:', notif.data);

                const notifData = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
                if (notifData.path === '/admin/users' && notifData.name === mockData.name) {
                    console.log('SUCCESS: Notification data is correct.');
                } else {
                    console.error('FAILURE: Notification data mismatch.');
                }
            } else {
                console.error('FAILURE: No notification found for the chapter admin.');
            }

            // 6. Verify created_at was updated (New Member indicator)
            const [updatedUser] = await pool.execute(
                'SELECT created_at FROM users WHERE id = ?',
                [pendingUser.id]
            );
            const joinDate = new Date(updatedUser[0].created_at);
            const now = new Date();
            const diffMs = now - joinDate;
            if (diffMs < 5000) { // Should be within 5 seconds
                console.log('SUCCESS: created_at was refreshed on approval.');
            } else {
                console.error('FAILURE: created_at was not refreshed.');
            }

        } else {
            console.error('Failed to update user approval details.');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        pool.end();
    }
}

verifyChapterNotification();

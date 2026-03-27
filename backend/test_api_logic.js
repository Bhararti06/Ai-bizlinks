const { pool } = require('./config/database');

async function testActualAPILogic() {
    try {
        console.log('=== Testing Actual API Logic ===\n');

        // Simulate what happens when the API is called
        console.log('Simulating: GET /api/references/revenue\n');

        // Get a chapter admin from GreenTree
        const [admins] = await pool.execute(`
            SELECT u.id, u.name, u.email, u.role, u.chapter, u.organization_id, o.name as org_name
            FROM users u
            JOIN organizations o ON u.organization_id = o.id
            WHERE u.role = 'chapter_admin' AND u.status = 'approved' AND o.name = 'GreenTree'
            LIMIT 3
        `);

        if (admins.length === 0) {
            console.log('❌ No GreenTree chapter admins found!');
            process.exit(1);
        }

        console.log('Testing for each GreenTree chapter admin:\n');

        for (const admin of admins) {
            console.log(`${'='.repeat(60)}`);
            console.log(`Chapter Admin: ${admin.name} (${admin.email})`);
            console.log(`Chapter: ${admin.chapter}`);
            console.log(`Organization: ${admin.org_name} (ID: ${admin.organization_id})`);
            console.log(`${'='.repeat(60)}\n`);

            // This is what the API controller does
            const role = admin.role;
            const userId = admin.id;
            const organizationId = admin.organization_id;

            let revenue = 0;

            if (role === 'chapter_admin') {
                // Get user's chapter
                const [userRows] = await pool.execute('SELECT chapter FROM users WHERE id = ?', [userId]);
                const userChapter = userRows[0].chapter;

                console.log(`1. User's chapter: ${userChapter}`);

                // Call getChapterRevenue
                const [revenueResult] = await pool.execute(`
                    SELECT SUM(r.business_done_amount) as total_revenue
                    FROM business_references r
                    JOIN users u ON r.user_id = u.id
                    LEFT JOIN users u2_id ON r.referred_to = u2_id.id
                    LEFT JOIN users u2_name ON r.referred_to = u2_name.name
                    WHERE r.organization_id = ? AND r.status = 'Business Done' AND r.referral_flag = '0' 
                      AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
                `, [organizationId, userChapter, userChapter, userChapter]);

                revenue = revenueResult[0].total_revenue || 0;

                console.log(`2. Revenue calculation result: ₹${revenue}\n`);

                // Get the thank you notes
                const [notes] = await pool.execute(`
                    SELECT 
                        r.business_done_amount,
                        r.status,
                        u.name as sender_name,
                        u.chapter as sender_chapter,
                        COALESCE(u2_id.name, u2_name.name) as receiver_name,
                        COALESCE(u2_id.chapter, u2_name.chapter) as receiver_chapter
                    FROM business_references r
                    JOIN users u ON r.user_id = u.id
                    LEFT JOIN users u2_id ON r.referred_to = u2_id.id
                    LEFT JOIN users u2_name ON r.referred_to = u2_name.name
                    WHERE r.organization_id = ? AND r.referral_flag = '0' 
                      AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
                    ORDER BY r.created_at DESC
                `, [organizationId, userChapter, userChapter, userChapter]);

                console.log(`3. Thank You Notes for ${userChapter} chapter:`);
                let businessDoneTotal = 0;
                notes.forEach((note, i) => {
                    const statusMarker = note.status === 'Business Done' ? '✅' : '⏳';
                    console.log(`   ${statusMarker} ₹${note.business_done_amount} - ${note.sender_name} (${note.sender_chapter}) → ${note.receiver_name} (${note.receiver_chapter}) [${note.status}]`);
                    if (note.status === 'Business Done') {
                        businessDoneTotal += parseFloat(note.business_done_amount || 0);
                    }
                });

                console.log(`\n4. Manual verification: ₹${businessDoneTotal}`);
                console.log(`5. API would return: { success: true, revenue: ${revenue} }\n`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🔍 IMPORTANT NOTES:');
        console.log('='.repeat(60));
        console.log('1. If the dashboard still shows ₹25,000, the backend server');
        console.log('   has NOT been restarted with the updated code.');
        console.log('');
        console.log('2. To fix: Stop the backend server (Ctrl+C) and restart it:');
        console.log('   npm start   OR   node server.js');
        console.log('');
        console.log('3. After restarting, hard refresh the browser (Ctrl+Shift+R)');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testActualAPILogic();

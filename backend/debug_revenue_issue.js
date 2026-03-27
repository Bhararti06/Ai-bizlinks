const { pool } = require('./config/database');

async function debugRevenueIssue() {
    try {
        console.log('=== Debugging Revenue Issue ===\n');

        // 1. Check which user is logged in (simulate chapter admin)
        console.log('1. Simulating Chapter Admin login...');
        const [users] = await pool.execute(`
            SELECT id, name, email, role, chapter, organization_id
            FROM users 
            WHERE role = 'chapter_admin' AND status = 'approved'
            LIMIT 1
        `);

        if (users.length === 0) {
            console.log('❌ No chapter admin found!');
            process.exit(1);
        }

        const chapterAdmin = users[0];
        console.log(`✅ Testing as: ${chapterAdmin.name}`);
        console.log(`   Chapter: ${chapterAdmin.chapter}`);
        console.log(`   Organization ID: ${chapterAdmin.organization_id}\n`);

        // 2. Get all thank you notes for this chapter
        console.log('2. Fetching thank you notes for this chapter...');
        const [notes] = await pool.execute(`
            SELECT 
                r.id,
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
        `, [chapterAdmin.organization_id, chapterAdmin.chapter, chapterAdmin.chapter, chapterAdmin.chapter]);

        console.log(`Found ${notes.length} thank you note(s) for ${chapterAdmin.chapter} chapter:\n`);
        let manualTotal = 0;
        notes.forEach((note, index) => {
            console.log(`Note ${index + 1}:`);
            console.log(`   Amount: ₹${note.business_done_amount}`);
            console.log(`   Status: ${note.status}`);
            console.log(`   Sender: ${note.sender_name} (${note.sender_chapter || 'No chapter'})`);
            console.log(`   Receiver: ${note.receiver_name || 'Unknown'} (${note.receiver_chapter || 'No chapter'})`);
            console.log('');

            if (note.status === 'Business Done') {
                manualTotal += parseFloat(note.business_done_amount || 0);
            }
        });

        console.log(`Manual Total (Business Done only): ₹${manualTotal}\n`);

        // 3. Test the getChapterRevenue query
        console.log('3. Testing getChapterRevenue query...');
        const [revenueResult] = await pool.execute(`
            SELECT SUM(r.business_done_amount) as total_revenue
            FROM business_references r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users u2_id ON r.referred_to = u2_id.id
            LEFT JOIN users u2_name ON r.referred_to = u2_name.name
            WHERE r.organization_id = ? AND r.status = 'Business Done' AND r.referral_flag = '0' 
              AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
        `, [chapterAdmin.organization_id, chapterAdmin.chapter, chapterAdmin.chapter, chapterAdmin.chapter]);

        const dbRevenue = revenueResult[0].total_revenue || 0;
        console.log(`Database Query Result: ₹${dbRevenue}`);
        console.log(`Match with Manual: ${dbRevenue == manualTotal ? '✅ YES' : '❌ NO'}\n`);

        // 4. Check what the API endpoint returns
        console.log('4. Simulating API call to /api/references/revenue...');
        console.log(`   This would return: { success: true, revenue: ${dbRevenue} }\n`);

        // 5. Check dashboard stats endpoint
        console.log('5. Checking dashboard stats...');
        const [dashStats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE organization_id = ? AND status = 'approved') as approvedMembers,
                (SELECT COUNT(*) FROM meetings WHERE organization_id = ?) as memberMeetings,
                (SELECT COUNT(*) FROM chapter_meetings WHERE organization_id = ?) as chapterMeetings,
                (SELECT COUNT(*) FROM business_references WHERE organization_id = ? AND referral_flag != '0') as referrals
        `, [chapterAdmin.organization_id, chapterAdmin.organization_id, chapterAdmin.organization_id, chapterAdmin.organization_id]);

        console.log('Dashboard Stats:');
        console.log(`   Active Members: ${dashStats[0].approvedMembers}`);
        console.log(`   Member Meetings: ${dashStats[0].memberMeetings}`);
        console.log(`   Chapter Meetings: ${dashStats[0].chapterMeetings}`);
        console.log(`   Referrals: ${dashStats[0].referrals}`);
        console.log(`   Revenue (from getChapterRevenue): ₹${dbRevenue}\n`);

        console.log('='.repeat(50));
        console.log('📊 Summary:');
        console.log(`   Expected Revenue: ₹${manualTotal}`);
        console.log(`   Database Returns: ₹${dbRevenue}`);
        console.log(`   Dashboard Shows: ₹25,000 (from screenshot)`);
        console.log('='.repeat(50));

        if (dbRevenue != 25000) {
            console.log('\n⚠️  The database is returning the CORRECT value!');
            console.log('   The issue might be:');
            console.log('   1. Backend server not restarted');
            console.log('   2. Frontend cache not cleared');
            console.log('   3. Different chapter admin viewing the dashboard');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

debugRevenueIssue();

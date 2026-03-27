const { pool } = require('./config/database');

async function findCorrectChapter() {
    try {
        console.log('=== Finding Chapter with ₹25,000 Revenue ===\n');

        // Get all organizations and their chapters
        const [orgs] = await pool.execute('SELECT id, name FROM organizations');

        for (const org of orgs) {
            console.log(`\nOrganization: ${org.name} (ID: ${org.id})`);
            console.log('='.repeat(50));

            // Get all chapters in this organization
            const [chapters] = await pool.execute(`
                SELECT DISTINCT chapter 
                FROM users 
                WHERE organization_id = ? AND chapter IS NOT NULL
                ORDER BY chapter
            `, [org.id]);

            if (chapters.length === 0) {
                console.log('  No chapters found\n');
                continue;
            }

            for (const chapterRow of chapters) {
                const chapter = chapterRow.chapter;

                // Calculate revenue for this chapter
                const [revenueResult] = await pool.execute(`
                    SELECT SUM(r.business_done_amount) as total_revenue
                    FROM business_references r
                    JOIN users u ON r.user_id = u.id
                    LEFT JOIN users u2_id ON r.referred_to = u2_id.id
                    LEFT JOIN users u2_name ON r.referred_to = u2_name.name
                    WHERE r.organization_id = ? AND r.status = 'Business Done' AND r.referral_flag = '0' 
                      AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
                `, [org.id, chapter, chapter, chapter]);

                const revenue = parseFloat(revenueResult[0].total_revenue || 0);

                // Get chapter admin count
                const [adminCount] = await pool.execute(`
                    SELECT COUNT(*) as count
                    FROM users
                    WHERE organization_id = ? AND chapter = ? AND role = 'chapter_admin' AND status = 'approved'
                `, [org.id, chapter]);

                // Get member count
                const [memberCount] = await pool.execute(`
                    SELECT COUNT(*) as count
                    FROM users
                    WHERE organization_id = ? AND chapter = ? AND status = 'approved'
                `, [org.id, chapter]);

                const marker = revenue === 25000 ? ' ⭐ MATCH!' : '';
                console.log(`  ${chapter}: ₹${revenue.toLocaleString()} (${memberCount[0].count} members, ${adminCount[0].count} admins)${marker}`);

                if (revenue === 25000) {
                    console.log(`\n  📋 Details for ${chapter}:`);

                    // Get thank you notes
                    const [notes] = await pool.execute(`
                        SELECT 
                            r.business_done_amount,
                            u.name as sender_name,
                            u.chapter as sender_chapter,
                            COALESCE(u2_id.name, u2_name.name) as receiver_name,
                            COALESCE(u2_id.chapter, u2_name.chapter) as receiver_chapter
                        FROM business_references r
                        JOIN users u ON r.user_id = u.id
                        LEFT JOIN users u2_id ON r.referred_to = u2_id.id
                        LEFT JOIN users u2_name ON r.referred_to = u2_name.name
                        WHERE r.organization_id = ? AND r.status = 'Business Done' AND r.referral_flag = '0' 
                          AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
                    `, [org.id, chapter, chapter, chapter]);

                    notes.forEach((note, i) => {
                        console.log(`    ${i + 1}. ₹${note.business_done_amount} from ${note.sender_name} (${note.sender_chapter}) to ${note.receiver_name} (${note.receiver_chapter})`);
                    });

                    // Get chapter admins
                    const [admins] = await pool.execute(`
                        SELECT name, email
                        FROM users
                        WHERE organization_id = ? AND chapter = ? AND role = 'chapter_admin' AND status = 'approved'
                    `, [org.id, chapter]);

                    console.log(`\n  👤 Chapter Admins:`);
                    admins.forEach(admin => {
                        console.log(`    - ${admin.name} (${admin.email})`);
                    });
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Search complete!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

findCorrectChapter();

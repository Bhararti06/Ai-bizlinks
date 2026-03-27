const { pool } = require('./config/database');

async function testRevenueCalculation() {
    try {
        console.log('=== Testing Revenue Calculation Fix ===\n');

        // Get all thank you notes
        console.log('1. Fetching all thank you notes...');
        const [allNotes] = await pool.execute(`
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
            WHERE r.referral_flag = '0' AND r.status = 'Business Done'
            ORDER BY r.created_at DESC
        `);

        console.log(`\nFound ${allNotes.length} thank you note(s):\n`);
        let totalRevenue = 0;
        allNotes.forEach((note, index) => {
            console.log(`Note ${index + 1}:`);
            console.log(`   Amount: ₹${note.business_done_amount}`);
            console.log(`   Sender: ${note.sender_name} (${note.sender_chapter || 'No chapter'})`);
            console.log(`   Receiver: ${note.receiver_name || 'Unknown'} (${note.receiver_chapter || 'No chapter'})`);
            console.log(`   Status: ${note.status}`);
            console.log('');
            totalRevenue += parseFloat(note.business_done_amount || 0);
        });

        console.log(`Total Revenue (All): ₹${totalRevenue}\n`);

        // Test chapter revenue calculation
        console.log('2. Testing chapter revenue calculation...');

        // Get unique chapters
        const chapters = [...new Set(allNotes.flatMap(n => [n.sender_chapter, n.receiver_chapter]).filter(Boolean))];

        for (const chapter of chapters) {
            const [result] = await pool.execute(`
                SELECT SUM(r.business_done_amount) as total_revenue
                FROM business_references r
                JOIN users u ON r.user_id = u.id
                LEFT JOIN users u2_id ON r.referred_to = u2_id.id
                LEFT JOIN users u2_name ON r.referred_to = u2_name.name
                WHERE r.status = 'Business Done' AND r.referral_flag = '0' 
                  AND (u.chapter = ? OR u2_id.chapter = ? OR u2_name.chapter = ?)
            `, [chapter, chapter, chapter]);

            const chapterRevenue = result[0].total_revenue || 0;

            // Manual calculation
            const chapterNotes = allNotes.filter(n =>
                n.sender_chapter === chapter || n.receiver_chapter === chapter
            );
            const manualTotal = chapterNotes.reduce((sum, n) => sum + parseFloat(n.business_done_amount || 0), 0);

            console.log(`\n${chapter} Chapter:`);
            console.log(`   Database Query Result: ₹${chapterRevenue}`);
            console.log(`   Manual Calculation: ₹${manualTotal}`);
            console.log(`   Match: ${chapterRevenue === manualTotal ? '✅ YES' : '❌ NO'}`);
            console.log(`   Notes included: ${chapterNotes.length}`);
            chapterNotes.forEach(n => {
                console.log(`      - ₹${n.business_done_amount} from ${n.sender_name} to ${n.receiver_name}`);
            });
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Revenue calculation test complete!');
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testRevenueCalculation();

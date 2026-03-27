const { pool } = require('./backend/config/database');

async function checkReferralData() {
    try {
        console.log('=== CHECKING REFERRAL DATA ===\n');

        // Get the referral from Poonam to Kartik
        const [referrals] = await pool.execute(`
            SELECT 
                br.id,
                br.reference_name,
                br.referral_flag,
                br.status,
                creator.name as created_by_name,
                creator.chapter as sender_chapter,
                receiver.name as receiver_name,
                receiver.chapter as receiver_chapter,
                br.referred_to
            FROM business_references br
            LEFT JOIN users creator ON br.user_id = creator.id
            LEFT JOIN users receiver ON br.referred_to = receiver.id OR br.referred_to = receiver.name
            WHERE creator.name LIKE '%Poonam%'
            ORDER BY br.created_at DESC
            LIMIT 5
        `);

        console.log('Referrals created by Poonam:');
        console.table(referrals);

        // Check John Doe's chapter
        const [johnDoe] = await pool.execute(`
            SELECT id, name, email, role, chapter
            FROM users
            WHERE name LIKE '%John%' AND role = 'chapter_admin'
        `);

        console.log('\nJohn Doe (Chapter Admin) details:');
        console.table(johnDoe);

        // Check Kartik's details
        const [kartik] = await pool.execute(`
            SELECT id, name, email, chapter
            FROM users
            WHERE name LIKE '%Kartik%'
        `);

        console.log('\nKartik details:');
        console.table(kartik);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkReferralData();

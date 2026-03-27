const { pool } = require('./config/database');

async function checkReferrals() {
    const orgId = 1;
    try {
        const [rows] = await pool.execute('SELECT id, reference_name, status, referral_flag, business_done_amount FROM business_references WHERE organization_id = ?', [orgId]);
        console.log(`--- Referrals for Org ${orgId} ---`);
        console.table(rows);
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

checkReferrals();

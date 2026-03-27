const { pool } = require('./backend/config/database');

async function checkRevenue() {
    try {
        // Get all Business Done records
        const [allRecords] = await pool.execute(`
            SELECT id, reference_name, referral_flag, business_done_amount, status
            FROM business_references
            WHERE status = 'Business Done'
            ORDER BY created_at DESC
        `);

        console.log('All Business Done Records:');
        console.log(JSON.stringify(allRecords, null, 2));

        // Current revenue calculation (includes referrals)
        const [currentRevenue] = await pool.execute(`
            SELECT SUM(business_done_amount) as total_revenue
            FROM business_references
            WHERE status = 'Business Done' AND (referral_flag = '1' OR referral_flag IS NULL)
        `);

        console.log('\nCurrent Revenue Calculation (Referrals):', currentRevenue[0].total_revenue);

        // Correct revenue calculation (only Thank You Notes)
        const [correctRevenue] = await pool.execute(`
            SELECT SUM(business_done_amount) as total_revenue
            FROM business_references
            WHERE status = 'Business Done' AND referral_flag = '0'
        `);

        console.log('Correct Revenue Calculation (Thank You Notes Only):', correctRevenue[0].total_revenue);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRevenue();

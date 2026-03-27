const { pool } = require('./backend/config/database');

async function testRevenueAPI() {
    try {
        // Test the actual model method
        const Reference = require('./backend/models/Reference');

        // Assuming organization_id = 18 (GreenTree)
        const revenue = await Reference.getRevenue(18);

        console.log('✅ Revenue API Test Results:');
        console.log(`Total Revenue: ₹${revenue.toLocaleString('en-IN')}`);
        console.log(`Expected: ₹125,000`);
        console.log(`Match: ${revenue == 125000 ? '✅ PASS' : '❌ FAIL'}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testRevenueAPI();

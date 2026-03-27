const fs = require('fs');
const path = require('path');

// Read token
const tokenPath = path.join(__dirname, 'admin_token.json');
if (!fs.existsSync(tokenPath)) {
    console.error('Token file not found. Run test_admin_login.js first.');
    process.exit(1);
}

const authData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const token = authData.data.token;
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

const BASE_URL = 'http://localhost:5000/api';

async function verifyFixes() {
    try {
        console.log('--- Verifying Data Visibility Fixes ---\n');

        // 1. Verify Dashboard Stats (Referral Count Fix)
        console.log('[VERIFY] Dashboard Statistics (Referral Count)');
        const dashRes = await fetch(`${BASE_URL}/organizations/dashboard/stats`, { headers });
        const dashData = await dashRes.json();
        if (dashData.success) {
            console.log(`   Referral Count: ${dashData.data.counts.referrals}`);
            if (dashData.data.counts.referrals >= 3) {
                console.log('   [PASS] Stats include all referral flags (Hot, Warm, 1)');
            } else {
                console.log('   [FAIL] Stats still filtering referrals. Count: ' + dashData.data.counts.referrals);
            }
        } else {
            console.log('   [ERROR] Dashboard API Failed:', dashData);
        }

        // 2. Verify Member Directory (Category Name Join)
        console.log('\n[VERIFY] Member Directory (Category Name Join)');
        const membersRes = await fetch(`${BASE_URL}/users/approved`, { headers });
        const membersData = await membersRes.json();
        if (membersData.success && membersData.data.length > 0) {
            const firstMember = membersData.data[0];
            console.log(`   Member Name: ${firstMember.name}`);
            console.log(`   Category Name: ${firstMember.category_name}`);
            console.log(`   Plan Name: ${firstMember.plan_name}`);
            if (firstMember.category_name) {
                console.log('   [PASS] Category name joined correctly');
            } else {
                console.log('   [FAIL] Category name is missing');
            }
        } else {
            console.log('   [ERROR] Members API Failed:', membersData);
        }

        // 3. Verify Members Summary (Referral Count Subquery Fix)
        console.log('\n[VERIFY] Members Summary (Referral Count Subquery)');
        const summaryRes = await fetch(`${BASE_URL}/users/summary`, { headers });
        const summaryData = await summaryRes.json();
        if (summaryData.success && summaryData.data.length > 0) {
            console.log('   Member Summaries (Top 3):');
            summaryData.data.slice(0, 3).forEach(m => {
                console.log(`   - ${m.name}: Referrals Sent: ${m.referral_count}`);
            });

            const hasReferrals = summaryData.data.some(m => m.referral_count > 0);
            if (hasReferrals) {
                console.log('   [PASS] Referral counts are being tracked correctly');
            } else {
                console.log('   [FAIL] Referral counts are still 0');
            }
        } else {
            console.log('   [ERROR] Summary API Failed:', summaryData);
        }

        console.log('\n--- Verification Completed ---');
    } catch (error) {
        console.error('\n[FATAL ERROR]', error.message);
        if (error.stack) console.error(error.stack);
    }
}

verifyFixes().then(() => process.exit(0));

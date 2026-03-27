const { pool } = require('./config/database');

async function findMembershipRequests() {
    try {
        console.log('=== Membership Request Details ===\n');

        console.log('📋 Table: users');
        console.log('📊 Status Field: "pending" = membership request\n');

        // Get schema of users table
        console.log('1. Checking users table schema...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM users');

        console.log('\n📝 Key columns for membership requests:');
        const relevantColumns = ['id', 'organization_id', 'name', 'email', 'status', 'role', 'chapter', 'first_name', 'last_name', 'contact_number', 'years_in_business', 'created_at'];
        columns.forEach(col => {
            if (relevantColumns.includes(col.Field)) {
                console.log(`   - ${col.Field} (${col.Type})`);
            }
        });

        // Get sample pending requests
        console.log('\n2. Fetching sample membership requests...');
        const [requests] = await pool.execute(`
            SELECT 
                id,
                organization_id,
                name,
                email,
                status,
                role,
                chapter,
                first_name,
                last_name,
                contact_number,
                years_in_business,
                created_at
            FROM users 
            WHERE status = 'pending'
            ORDER BY created_at DESC
            LIMIT 5
        `);

        if (requests.length > 0) {
            console.log(`\n✅ Found ${requests.length} pending membership request(s):\n`);
            requests.forEach((req, index) => {
                console.log(`Request ${index + 1}:`);
                console.log(`   ID: ${req.id}`);
                console.log(`   Name: ${req.name}`);
                console.log(`   Email: ${req.email}`);
                console.log(`   Organization ID: ${req.organization_id}`);
                console.log(`   Chapter: ${req.chapter || 'Not specified'}`);
                console.log(`   Status: ${req.status}`);
                console.log(`   Role: ${req.role}`);
                console.log(`   Created: ${req.created_at}`);
                console.log('');
            });
        } else {
            console.log('\n📭 No pending membership requests found.');
        }

        // Show status breakdown
        console.log('\n3. User status breakdown:');
        const [statusCounts] = await pool.execute(`
            SELECT status, COUNT(*) as count 
            FROM users 
            GROUP BY status
            ORDER BY count DESC
        `);

        statusCounts.forEach(s => {
            console.log(`   ${s.status}: ${s.count} users`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('📌 Summary:');
        console.log('   Table: users');
        console.log('   Membership Requests: WHERE status = "pending"');
        console.log('   Approved Members: WHERE status = "approved"');
        console.log('   Rejected Requests: WHERE status = "rejected"');
        console.log('   Inactive Members: WHERE status = "inactive"');
        console.log('   Deleted Members: WHERE status = "deleted"');
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

findMembershipRequests();

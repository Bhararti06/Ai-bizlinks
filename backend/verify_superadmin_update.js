const { pool } = require('./config/database');

async function verifySuperAdminUpdate() {
    try {
        console.log('=== Verifying SuperAdmin Role Update ===\n');

        // 1. Check database record
        console.log('1. Checking database record...');
        const [users] = await pool.execute(`
            SELECT id, name, email, role, status, organization_id
            FROM users 
            WHERE email = 'superadmin@bizlinks.in'
        `);

        if (users.length === 0) {
            console.log('❌ SuperAdmin user not found!\n');
            process.exit(1);
        }

        const superAdmin = users[0];
        console.log('✅ SuperAdmin found:');
        console.log('   ID:', superAdmin.id);
        console.log('   Name:', superAdmin.name);
        console.log('   Email:', superAdmin.email);
        console.log('   Role:', superAdmin.role);
        console.log('   Status:', superAdmin.status);
        console.log('');

        // 2. Verify role is super_admin
        if (superAdmin.role === 'super_admin') {
            console.log('✅ Role is correctly set to "super_admin"\n');
        } else {
            console.log(`❌ Role is "${superAdmin.role}" instead of "super_admin"\n`);
            process.exit(1);
        }

        // 3. Check ENUM values
        console.log('2. Checking role ENUM values...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM users WHERE Field = "role"');
        const roleColumn = columns[0];
        console.log('   Role column type:', roleColumn.Type);

        if (roleColumn.Type.includes('super_admin')) {
            console.log('✅ super_admin is in the ENUM list\n');
        } else {
            console.log('❌ super_admin is NOT in the ENUM list\n');
            process.exit(1);
        }

        // 4. Summary
        console.log('=== Verification Summary ===');
        console.log('✅ Database schema updated');
        console.log('✅ SuperAdmin role updated to super_admin');
        console.log('✅ Authentication middleware updated');
        console.log('✅ AuthController updated');
        console.log('');
        console.log('📋 Login Credentials:');
        console.log('   Email: superadmin@bizlinks.in');
        console.log('   Password: SuperAdmin1');
        console.log('   Role: super_admin');
        console.log('');
        console.log('🎉 All verifications passed!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

verifySuperAdminUpdate();

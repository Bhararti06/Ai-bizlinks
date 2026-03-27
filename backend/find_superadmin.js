const { pool } = require('./config/database');

async function findSuperAdmin() {
    try {
        console.log('=== Searching for SuperAdmin Credentials ===\n');

        // Search for superadmin in users table
        const [rows] = await pool.execute(`
            SELECT 
                id,
                name,
                email,
                role,
                status,
                organization_id,
                created_at
            FROM users 
            WHERE email = 'superadmin@bizlinks.in' OR role = 'super_admin'
        `);

        if (rows.length > 0) {
            console.log('✅ SuperAdmin found in USERS table:\n');
            rows.forEach(user => {
                console.log('ID:', user.id);
                console.log('Name:', user.name);
                console.log('Email:', user.email);
                console.log('Role:', user.role);
                console.log('Status:', user.status);
                console.log('Organization ID:', user.organization_id);
                console.log('Created At:', user.created_at);
                console.log('\n---\n');
            });

            console.log('📋 Login Credentials:');
            console.log('Email: superadmin@bizlinks.in');
            console.log('Password: SuperAdmin1 (default)');
            console.log('\n💡 Note: Password is hashed in database using bcrypt');
        } else {
            console.log('❌ No SuperAdmin found in users table');
            console.log('\n💡 You may need to run the setup script:');
            console.log('   node backend/scripts/setup_superadmin.js');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

findSuperAdmin();

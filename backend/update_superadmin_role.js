const { pool } = require('./config/database');

async function updateSuperAdminRole() {
    try {
        console.log('=== Updating SuperAdmin Role ===\n');

        // 1. Check current role column type
        console.log('1. Checking role column schema...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM users WHERE Field = "role"');
        const roleColumn = columns[0];
        console.log('Current role column type:', roleColumn.Type);
        console.log('');

        // 2. Check if role is ENUM and if super_admin is in the list
        if (roleColumn.Type.startsWith('enum')) {
            console.log('Role is an ENUM type. Checking if super_admin is allowed...');
            const enumValues = roleColumn.Type.match(/enum\((.*)\)/)[1];
            console.log('Current ENUM values:', enumValues);

            if (!enumValues.includes('super_admin')) {
                console.log('\n⚠️  super_admin is NOT in the ENUM list!');
                console.log('Adding super_admin to the ENUM...\n');

                // Alter the ENUM to include super_admin
                await pool.execute(`
                    ALTER TABLE users 
                    MODIFY COLUMN role ENUM('member', 'admin', 'chapter_admin', 'super_admin') 
                    DEFAULT 'member'
                `);
                console.log('✅ ENUM updated to include super_admin\n');
            } else {
                console.log('✅ super_admin is already in the ENUM list\n');
            }
        }

        // 3. Update the superadmin user's role
        console.log('2. Updating superadmin@bizlinks.in role to super_admin...');
        const [result] = await pool.execute(`
            UPDATE users 
            SET role = 'super_admin' 
            WHERE email = 'superadmin@bizlinks.in'
        `);

        if (result.affectedRows > 0) {
            console.log('✅ Successfully updated role to super_admin\n');
        } else {
            console.log('❌ No user found with email superadmin@bizlinks.in\n');
        }

        // 4. Verify the update
        console.log('3. Verifying the update...');
        const [rows] = await pool.execute(`
            SELECT id, name, email, role, status 
            FROM users 
            WHERE email = 'superadmin@bizlinks.in'
        `);

        if (rows.length > 0) {
            console.log('\n📋 Updated SuperAdmin Record:');
            console.log('ID:', rows[0].id);
            console.log('Name:', rows[0].name);
            console.log('Email:', rows[0].email);
            console.log('Role:', rows[0].role);
            console.log('Status:', rows[0].status);
        }

        console.log('\n✅ SuperAdmin role update complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

updateSuperAdminRole();


const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function setupSuperAdmin() {
    console.log('Setting up Super Admin...');
    try {
        // 1. Check if users table has organization_id nullable
        console.log('Checking users table schema...');
        const [columns] = await pool.execute('SHOW COLUMNS FROM users');
        const orgIdCol = columns.find(c => c.Field === 'organization_id');
        console.log('organization_id nullable:', orgIdCol ? orgIdCol.Null : 'Unknown');

        // 2. Check if members table exists
        const [tables] = await pool.execute('SHOW TABLES LIKE "members"');
        const membersTableExists = tables.length > 0;
        console.log('members table exists:', membersTableExists);

        // 3. Create Super Admin User
        const email = 'superadmin@bizlinks.in';
        const password = 'SuperAdmin1';
        const name = 'Bharti';

        // Check if exists
        const [existing] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('Super Admin user already exists.');
            // Update password if needed? checking hash to be safe? 
            // For now just skip.
        } else {
            console.log('Creating Super Admin user...');
            const hashedPassword = await bcrypt.hash(password, 10);

            // Handle organization_id
            let orgId = null;
            if (orgIdCol && orgIdCol.Null === 'NO') {
                // If not nullable, we might need a dummy organization or find one.
                // Or maybe existing data has one.
                // Let's create a "System" organization if forced?
                // Or just try 0 if it's int not null (might fail FK).
                console.log('organization_id is NOT NULL. Checking if we need to create a dummy org or if FK allows 0...');
                // Usually it's a FK.
                // Let's create a "Super Admin Org" to be safe if strictly required
                const [orgs] = await pool.execute('SELECT id FROM organizations WHERE name = "Super Admin Org"');
                if (orgs.length > 0) {
                    orgId = orgs[0].id;
                } else {
                    const [res] = await pool.execute('INSERT INTO organizations (name, admin_name, admin_email) VALUES (?, ?, ?)',
                        ['Super Admin Org', name, email]);
                    orgId = res.insertId;
                    console.log('Created Super Admin Org with ID:', orgId);
                }
            }

            // Insert
            // User.create method: (organizationId, name, email, hashedPassword, role = 'member', status = 'pending', chapter = null, firstName = null, lastName = null, contactNumber = null, yearsInBusiness = null)
            // But I'll do raw insert to be sure about fields.
            // Using logic similar to User.create but with role 'super_admin' if possible.

            const insertQuery = `
                INSERT INTO users (organization_id, name, email, password, role, status)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            // Role: super_admin might not be in enum if it is an enum. Check schema?
            // Columns check for role type?
            const roleCol = columns.find(c => c.Field === 'role');
            console.log('Role column type:', roleCol ? roleCol.Type : 'Unknown');

            // Assume string or enum. 'super_admin' is safe if string. If enum, might fail if not in list.
            // If enum, usually 'admin', 'member', 'chapter_admin'.
            // Given existing code checks `userRole === 'admin'`, maybe just 'admin'?
            // But specific requirement "This is seperate from admin and member".
            // I'll try 'super_admin'.

            await pool.execute(insertQuery, [orgId, name, email, hashedPassword, 'super_admin', 'approved']);
            console.log('Super Admin user created successfully.');
        }

        // 4. Insert into members table if it exists
        if (membersTableExists) {
            // Check columns for members
            const [memberCols] = await pool.execute('SHOW COLUMNS FROM members');
            console.log('Members table columns:', memberCols.map(c => c.Field));

            // Check if already in members
            const [existingMem] = await pool.execute('SELECT * FROM members WHERE email = ?', [email]); // Assuming email column
            if (existingMem.length === 0) {
                // Insert
                // Need to know columns. 
                console.log('Inserting into members table is pending column discovery...');
                // I won't blind insert.
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

setupSuperAdmin();

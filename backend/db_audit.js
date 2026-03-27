const { pool } = require('./config/database');

async function auditData() {
    const orgId = 1;
    const tables = [
        'organizations',
        'users',
        'member_categories',
        'membership_plans',
        'chapters',
        'meetings',
        'events',
        'trainings',
        'business_references',
        'posts',
        'notifications'
    ];

    console.log(`--- Data Audit for Organization ID: ${orgId} ---`);

    for (const table of tables) {
        try {
            let query = `SELECT COUNT(*) as count FROM ${table}`;
            let params = [];

            // Most tables use organization_id, but some might be global or use different names
            if (table === 'organizations') {
                query += ' WHERE id = ?';
                params.push(orgId);
            } else if (table === 'users') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'member_categories') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'membership_plans') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'chapters') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'meetings') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'events') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'trainings') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'business_references') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'posts') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            } else if (table === 'notifications') {
                query += ' WHERE organization_id = ?';
                params.push(orgId);
            }

            const [rows] = await pool.execute(query, params);
            console.log(`${table.padEnd(20)}: ${rows[0].count}`);
        } catch (error) {
            console.log(`${table.padEnd(20)}: Error - ${error.message}`);
        }
    }

    // Check data for other orgs to see if data is misaligned
    console.log(`\n--- Global Data Summary ---`);
    for (const table of tables) {
        try {
            const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`${table.padEnd(20)}: ${rows[0].count}`);
        } catch (error) {
            // console.log(`${table.padEnd(20)}: Error - ${error.message}`);
        }
    }

    process.exit(0);
}

auditData();

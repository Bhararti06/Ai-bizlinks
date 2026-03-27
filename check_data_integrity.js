const { pool } = require('./backend/config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function checkIntegrity() {
    try {
        console.log('--- Data Integrity Check ---');

        // 1. List Organizations
        const [orgs] = await pool.execute('SELECT id, name, sub_domain FROM organizations');
        console.log('\n--- Organizations ---');
        console.table(orgs);

        const orgIds = orgs.map(o => o.id);

        // 2. Count Users per Org
        const [users] = await pool.execute('SELECT organization_id, COUNT(*) as count FROM users GROUP BY organization_id');
        console.log('\n--- Users per Organization ---');
        console.table(users);

        // 3. Count Meetings per Org
        const [meetings] = await pool.execute('SELECT organization_id, COUNT(*) as count FROM meetings GROUP BY organization_id');
        console.log('\n--- Meetings per Organization ---');
        console.table(meetings);

        // 4. Count Events per Org
        const [events] = await pool.execute('SELECT organization_id, COUNT(*) as count FROM events GROUP BY organization_id');
        console.log('\n--- Events per Organization ---');
        console.table(events);

        // 5. Count Trainings per Org
        const [trainings] = await pool.execute('SELECT organization_id, COUNT(*) as count FROM training_sessions GROUP BY organization_id');
        console.log('\n--- Trainings per Organization ---');
        console.table(trainings);

        // 6. Count Categories
        const [cats] = await pool.execute('SELECT organization_id, COUNT(*) as count FROM member_categories GROUP BY organization_id');
        console.log('\n--- Categories per Organization ---');
        console.table(cats);

        // 7. Check for NULL organization_id
        console.log('\n--- Abandoned/NULL Org Data ---');
        const tables = ['users', 'meetings', 'events', 'training_sessions', 'member_categories', 'membership_plans'];
        for (const table of tables) {
            try {
                const [nullRows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table} WHERE organization_id IS NULL`);
                if (nullRows[0].count > 0) {
                    console.log(`${table}: ${nullRows[0].count} rows with NULL organization_id`);
                }
            } catch (e) {
                console.log(`Error checking ${table}: ${e.message}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkIntegrity();

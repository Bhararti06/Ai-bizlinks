const { pool } = require('./backend/config/database');

async function verifyTables() {
    try {
        console.log('--- Verifying Tables ---');

        const [tables] = await pool.execute('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables found:', tableNames);

        const required = ['users', 'organizations', 'member_categories', 'membership_plans'];
        const missing = required.filter(t => !tableNames.includes(t));

        if (missing.length > 0) {
            console.error('MISSING TABLES:', missing);
            process.exit(1);
        } else {
            console.log('All required tables present.');
        }

        // Check if member_categories is empty? (Shouldn't matter for LEFT JOIN)

        process.exit(0);
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifyTables();

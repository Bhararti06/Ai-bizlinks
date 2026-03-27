const { pool } = require('./config/database');
async function describeRefs() {
    try {
        const [columns] = await pool.execute('DESCRIBE business_references');
        console.log('Columns for business_references:', columns);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
describeRefs();

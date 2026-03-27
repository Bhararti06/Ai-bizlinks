const { pool } = require('./config/database');

async function checkSchema() {
    try {
        const [rows] = await pool.execute('SHOW COLUMNS FROM business_references');
        rows.forEach(row => console.log(row.Field));
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

checkSchema();

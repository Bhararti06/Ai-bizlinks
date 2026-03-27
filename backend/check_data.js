const { pool } = require('./config/database');
async function checkData() {
    try {
        const [rows] = await pool.execute('SELECT * FROM business_references LIMIT 10');
        console.log('Sample Data:', rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
checkData();

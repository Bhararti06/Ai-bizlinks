const { pool } = require('./config/database');

async function check() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM business_references');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            console.log('Table "business_references" does not exist.');
        } else {
            console.error(err);
        }
    } finally {
        process.exit(0);
    }
}
check();

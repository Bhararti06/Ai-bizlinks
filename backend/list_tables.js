const { pool } = require('./config/database');
async function listTables() {
    try {
        const [rows] = await pool.execute('SHOW TABLES');
        console.log('Tables:', rows);
        for (const row of rows) {
            const tableName = Object.values(row)[0];
            const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
            console.log(`Columns for ${tableName}:`, columns);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
listTables();

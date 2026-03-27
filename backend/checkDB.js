const { pool } = require('./config/database');

async function checkDatabase() {
    try {
        const [tables] = await pool.execute('SHOW TABLES');
        console.log('Tables:', tables);

        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
            console.log(`Columns for ${tableName}:`, columns);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabase();

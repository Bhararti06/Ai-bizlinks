const mysql = require('mysql2/promise');
require('dotenv').config();

const increaseLimit = async () => {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Attempting to set GLOBAL max_allowed_packet to 64MB...');
        await pool.execute("SET GLOBAL max_allowed_packet = 67108864");
        console.log('Success!');

        const [rows] = await pool.execute("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('New Value:', JSON.stringify(rows[0], null, 2));

        await pool.end();
    } catch (error) {
        console.error('Failed to set global variable (might lack permissions):', error.message);
    }
};

increaseLimit();

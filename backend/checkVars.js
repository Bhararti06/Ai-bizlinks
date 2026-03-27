const mysql = require('mysql2/promise');
require('dotenv').config();

const checkVars = async () => {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const [rows] = await pool.execute("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log(JSON.stringify(rows, null, 2));
        await pool.end();
    } catch (error) {
        console.error('Error checking variables:', error);
    }
};

checkVars();

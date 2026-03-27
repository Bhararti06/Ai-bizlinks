const mysql = require('mysql2/promise');
require('dotenv').config();

const checkSchema = async () => {
    try {
        const pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const [rows] = await pool.execute('DESCRIBE organizations');
        console.log(JSON.stringify(rows, null, 2));
        await pool.end();
    } catch (error) {
        console.error('Error checking schema:', error);
    }
};

checkSchema();

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'community_portal_db_2'
});

async function checkTrainings() {
    try {
        const [rows] = await pool.query('SELECT id, training_title, image_path FROM trainings ORDER BY id DESC LIMIT 5');
        console.log('Recent Trainings Image Paths:');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTrainings();

const path = require('path');
require('dotenv').config();
const { pool } = require('./config/database');

async function check() {
    try {
        console.log('Checking visitors table constraints...');
        const [rows] = await pool.execute('SHOW CREATE TABLE visitors');
        console.log('CREATE TABLE:', rows[0]['Create Table']);

        console.log('\nChecking chapter_meeting_registrations table constraints...');
        const [rows2] = await pool.execute('SHOW CREATE TABLE chapter_meeting_registrations');
        console.log('CREATE TABLE:', rows2[0]['Create Table']);

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

check();

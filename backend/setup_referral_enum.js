const { pool } = require('./config/database');

async function updateEnum() {
    try {
        const query = `
      ALTER TABLE business_references 
      MODIFY COLUMN status ENUM('Open', 'Contacted', 'Business Done', 'Business Not Done', 'Closed') DEFAULT 'Open'
    `;
        await pool.execute(query);
        console.log('business_references status enum updated successfully');
    } catch (error) {
        console.error('Error updating enum:', error);
    } finally {
        process.exit(0);
    }
}

updateEnum();

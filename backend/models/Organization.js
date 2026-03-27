const { pool } = require('../config/database');

class Organization {
    // Create a new organization
    static async create(name, adminName, adminEmail, subDomain, contactNumber, settings) {
        const query = `
      INSERT INTO organizations (name, admin_name, admin_email, sub_domain, contact_number, settings)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        const [result] = await pool.execute(query, [name, adminName, adminEmail, subDomain, contactNumber, JSON.stringify(settings)]);
        return result.insertId;
    }

    // Find organization by ID
    static async findById(id) {
        const query = 'SELECT * FROM organizations WHERE id = ?';
        const [rows] = await pool.execute(query, [id]);
        return rows[0] || null;
    }

    // Find organization by admin email
    static async findByAdminEmail(email) {
        const query = 'SELECT * FROM organizations WHERE admin_email = ?';
        const [rows] = await pool.execute(query, [email]);
        return rows[0] || null;
    }

    // Get all organizations
    static async getAll() {
        console.log('Organization model: getAll() started');
        const query = 'SELECT id, name, admin_name, admin_email, sub_domain, created_at FROM organizations ORDER BY created_at DESC';
        const [rows] = await pool.execute(query);
        console.log('Organization model: getAll() finished');
        return rows;
    }

    // Check if organization exists
    static async exists(name, adminEmail) {
        const query = 'SELECT id FROM organizations WHERE name = ? OR admin_email = ?';
        const [rows] = await pool.execute(query, [name, adminEmail]);
        return rows.length > 0;
    }

    // Find organization by name (Case Insensitive)
    static async findByName(name) {
        const [rows] = await pool.execute(
            'SELECT * FROM organizations WHERE LOWER(name) = LOWER(?)',
            [name]
        );
        return rows[0];
    }

    // Find organization by subdomain or name
    static async findByIdentifier(identifier) {
        const [rows] = await pool.execute(
            'SELECT * FROM organizations WHERE LOWER(sub_domain) = LOWER(?) OR LOWER(name) = LOWER(?)',
            [identifier, identifier]
        );
        return rows[0];
    }

    // Delete organization (for cleanup)
    static async delete(id) {
        const query = 'DELETE FROM organizations WHERE id = ?';
        const [result] = await pool.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Update organization details
    static async update(id, data) {
        const { name, admin_name, admin_email, contact_number, settings } = data;
        const query = `
            UPDATE organizations 
            SET name = ?, admin_name = ?, admin_email = ?, contact_number = ?, settings = ?
            WHERE id = ?
        `;
        const [result] = await pool.execute(query, [
            name,
            admin_name,
            admin_email,
            contact_number,
            JSON.stringify(settings),
            id
        ]);
        return result.affectedRows > 0;
    }
}

module.exports = Organization;

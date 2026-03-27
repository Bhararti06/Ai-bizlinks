const { pool } = require('../config/database');

class Chapter {
    static async create(data) {
        const query = `
      INSERT INTO chapters (
        organization_id, name, phone_number, street_address, 
        city, state, country, zip_code, email_id, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const [result] = await pool.execute(query, [
            data.organizationId,
            data.name,
            data.phoneNumber || null,
            data.streetAddress || null,
            data.city || null,
            data.state || null,
            data.country || null,
            data.zipCode || null,
            data.emailId || null,
            data.description || null
        ]);
        return result.insertId;
    }

    static async getAllByOrganization(organizationId) {
        const query = 'SELECT * FROM chapters WHERE organization_id = ? ORDER BY name ASC';
        const [rows] = await pool.execute(query, [organizationId]);
        return rows;
    }

    static async findById(id, organizationId) {
        const query = 'SELECT * FROM chapters WHERE id = ? AND organization_id = ?';
        const [rows] = await pool.execute(query, [id, organizationId]);
        return rows[0] || null;
    }

    static async findByName(name, organizationId) {
        const query = 'SELECT * FROM chapters WHERE name = ? AND organization_id = ?';
        const [rows] = await pool.execute(query, [name, organizationId]);
        return rows[0] || null;
    }

    static async update(id, organizationId, data) {
        const query = `
      UPDATE chapters 
      SET name = ?, phone_number = ?, street_address = ?, 
          city = ?, state = ?, country = ?, zip_code = ?, 
          email_id = ?, description = ?
      WHERE id = ? AND organization_id = ?
    `;
        const [result] = await pool.execute(query, [
            data.name,
            data.phoneNumber,
            data.streetAddress,
            data.city,
            data.state,
            data.country,
            data.zipCode,
            data.emailId,
            data.description,
            id,
            organizationId
        ]);
        return result.affectedRows > 0;
    }

    static async delete(id, organizationId) {
        const query = 'DELETE FROM chapters WHERE id = ? AND organization_id = ?';
        const [result] = await pool.execute(query, [id, organizationId]);
        return result.affectedRows > 0;
    }
}

module.exports = Chapter;

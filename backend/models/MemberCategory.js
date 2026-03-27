const { pool } = require('../config/database');

class MemberCategory {
    static async create(organizationId, name, description) {
        const query = `
            INSERT INTO member_categories (organization_id, name, description)
            VALUES (?, ?, ?)
        `;
        const [result] = await pool.execute(query, [organizationId, name, description || null]);
        return result.insertId;
    }

    static async getByOrg(organizationId) {
        const query = `
            SELECT * FROM member_categories 
            WHERE organization_id = ? 
            ORDER BY name ASC
        `;
        const [rows] = await pool.execute(query, [organizationId]);
        return rows;
    }

    static async findById(id, organizationId) {
        const query = `
            SELECT * FROM member_categories 
            WHERE id = ? AND organization_id = ?
        `;
        const [rows] = await pool.execute(query, [id, organizationId]);
        return rows[0];
    }

    static async update(id, organizationId, name, description) {
        const query = `
            UPDATE member_categories 
            SET name = ?, description = ? 
            WHERE id = ? AND organization_id = ?
        `;
        const [result] = await pool.execute(query, [name, description, id, organizationId]);
        return result.affectedRows > 0;
    }

    static async delete(id, organizationId) {
        const query = `
            DELETE FROM member_categories 
            WHERE id = ? AND organization_id = ?
        `;
        const [result] = await pool.execute(query, [id, organizationId]);
        return result.affectedRows > 0;
    }

    static async exists(organizationId, name, excludeId = null) {
        let query = 'SELECT id FROM member_categories WHERE organization_id = ? AND name = ?';
        let params = [organizationId, name];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [rows] = await pool.execute(query, params);
        return rows.length > 0;
    }
}

module.exports = MemberCategory;

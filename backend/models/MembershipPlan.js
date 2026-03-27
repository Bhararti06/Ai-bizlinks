const { pool } = require('../config/database');

class MembershipPlan {
    static async create(organizationId, name, description, fees, benefits) {
        const query = `
            INSERT INTO membership_plans (organization_id, name, description, fees, benefits)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [organizationId, name, description, fees, benefits]);
        return result.insertId;
    }

    static async getByOrg(organizationId) {
        const query = `
            SELECT * FROM membership_plans 
            WHERE organization_id = ? 
            ORDER BY name ASC
        `;
        const [rows] = await pool.execute(query, [organizationId]);
        return rows;
    }

    static async findById(id, organizationId) {
        const query = `
            SELECT * FROM membership_plans 
            WHERE id = ? AND organization_id = ?
        `;
        const [rows] = await pool.execute(query, [id, organizationId]);
        return rows[0];
    }

    static async update(id, organizationId, name, description, fees, benefits) {
        const query = `
            UPDATE membership_plans 
            SET name = ?, description = ?, fees = ?, benefits = ? 
            WHERE id = ? AND organization_id = ?
        `;
        const [result] = await pool.execute(query, [name, description, fees, benefits, id, organizationId]);
        return result.affectedRows > 0;
    }

    static async delete(id, organizationId) {
        const query = `
            DELETE FROM membership_plans 
            WHERE id = ? AND organization_id = ?
        `;
        const [result] = await pool.execute(query, [id, organizationId]);
        return result.affectedRows > 0;
    }

    static async exists(organizationId, name, excludeId = null) {
        let query = 'SELECT id FROM membership_plans WHERE organization_id = ? AND name = ?';
        let params = [organizationId, name];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const [rows] = await pool.execute(query, params);
        return rows.length > 0;
    }
}

module.exports = MembershipPlan;

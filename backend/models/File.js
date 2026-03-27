const { pool } = require('../config/database');

class File {
    static async create(organizationId, userId, name, path, type, size) {
        const query = `
      INSERT INTO files (organization_id, user_id, name, path, type, size)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        const [result] = await pool.execute(query, [organizationId, userId, name, path, type, size]);
        return result.insertId;
    }

    static async getByOrganization(organizationId) {
        const query = `
      SELECT f.*, u.name as uploaded_by_name
      FROM files f
      JOIN users u ON f.user_id = u.id
      WHERE f.organization_id = ?
      ORDER BY f.created_at DESC
    `;
        const [rows] = await pool.execute(query, [organizationId]);
        return rows;
    }

    static async findById(id) {
        const query = 'SELECT * FROM files WHERE id = ?';
        const [rows] = await pool.execute(query, [id]);
        return rows[0];
    }

    static async delete(id) {
        const query = 'DELETE FROM files WHERE id = ?';
        const [result] = await pool.execute(query, [id]);
        return result.affectedRows > 0;
    }
}

module.exports = File;

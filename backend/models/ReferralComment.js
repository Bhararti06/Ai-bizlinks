const { pool } = require('../config/database');

class ReferralComment {
    static async create(referralId, userId, comment) {
        const query = `
            INSERT INTO referral_comments (referral_id, user_id, comment)
            VALUES (?, ?, ?)
        `;
        const [result] = await pool.execute(query, [referralId, userId, comment]);
        return result.insertId;
    }

    static async getByReferralId(referralId) {
        const query = `
            SELECT c.*, u.name as author_name
            FROM referral_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.referral_id = ?
            ORDER BY c.created_at ASC
        `;
        const [rows] = await pool.execute(query, [referralId]);
        return rows;
    }
}

module.exports = ReferralComment;

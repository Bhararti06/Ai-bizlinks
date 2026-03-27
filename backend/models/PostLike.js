const { pool } = require('../config/database');

class PostLike {
    // Like a post (toggle)
    static async toggle(postId, userId) {
        // Check if already liked
        const checkQuery = 'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?';
        const [existing] = await pool.execute(checkQuery, [postId, userId]);

        if (existing.length > 0) {
            // Unlike
            const deleteQuery = 'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?';
            await pool.execute(deleteQuery, [postId, userId]);
            return { liked: false };
        } else {
            // Like
            const insertQuery = 'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)';
            await pool.execute(insertQuery, [postId, userId]);
            return { liked: true };
        }
    }

    // Remove like
    static async unlike(postId, userId) {
        const query = 'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?';
        const [result] = await pool.execute(query, [postId, userId]);
        return result.affectedRows > 0;
    }

    // Get all likes for a post
    static async getByPost(postId) {
        const query = `
      SELECT 
        pl.user_id,
        pl.created_at,
        u.name as user_name
      FROM post_likes pl
      LEFT JOIN users u ON pl.user_id = u.id
      WHERE pl.post_id = ?
      ORDER BY pl.created_at DESC
    `;

        const [rows] = await pool.execute(query, [postId]);
        return rows;
    }

    // Get like count for a post
    static async getCountByPost(postId) {
        const query = 'SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?';
        const [rows] = await pool.execute(query, [postId]);
        return rows[0].count;
    }

    // Check if user liked a post
    static async hasUserLiked(postId, userId) {
        const query = 'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?';
        const [rows] = await pool.execute(query, [postId, userId]);
        return rows.length > 0;
    }
}

module.exports = PostLike;

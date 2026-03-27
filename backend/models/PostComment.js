const { pool } = require('../config/database');

class PostComment {
  // Add a comment to a post
  static async create(postId, userId, comment) {
    const query = `
      INSERT INTO post_comments (post_id, user_id, comment)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(query, [postId, userId, comment]);
    return result.insertId;
  }

  // Get all comments for a post
  static async getByPost(postId, userId = null) {
    const query = `
      SELECT 
        pc.id,
        pc.post_id,
        pc.user_id,
        pc.comment,
        pc.created_at,
        u.name as user_name,
        u.profile_image as user_image,
        (SELECT COUNT(*) FROM post_comment_likes WHERE post_comment_id = pc.id) as like_count,
        (SELECT COUNT(*) > 0 FROM post_comment_likes WHERE post_comment_id = pc.id AND user_id = ?) as user_liked,
        (SELECT reaction_type FROM post_comment_likes WHERE post_comment_id = pc.id AND user_id = ?) as user_reaction
      FROM post_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.post_id = ?
      ORDER BY pc.created_at ASC
    `;

    const [rows] = await pool.execute(query, [userId, userId, postId]);

    // Get reaction summary for each comment
    const PostCommentLike = require('./PostCommentLike');
    for (let comment of rows) {
      comment.reactions = await PostCommentLike.getReactionSummary(comment.id);
    }

    return rows;
  }

  // Get comment by ID
  static async findById(commentId) {
    const query = `
      SELECT pc.*, u.name as user_name
      FROM post_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      WHERE pc.id = ?
    `;

    const [rows] = await pool.execute(query, [commentId]);
    return rows[0] || null;
  }

  // Delete comment
  static async delete(commentId, userId) {
    const query = `
      DELETE FROM post_comments
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.execute(query, [commentId, userId]);
    return result.affectedRows > 0;
  }

  // Check if user owns the comment
  static async isOwner(commentId, userId) {
    const query = 'SELECT id FROM post_comments WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(query, [commentId, userId]);
    return rows.length > 0;
  }

  // Get comment count for a post
  static async getCountByPost(postId) {
    const query = 'SELECT COUNT(*) as count FROM post_comments WHERE post_id = ?';
    const [rows] = await pool.execute(query, [postId]);
    return rows[0].count;
  }
}

module.exports = PostComment;

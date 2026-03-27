const { pool } = require('../config/database');

class Post {
  // Create a new post
  static async create(organizationId, userId, title, description, imagePath = null) {
    const query = `
      INSERT INTO posts (organization_id, user_id, title, description, image_path)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [organizationId, userId, title, description, imagePath]);
    return result.insertId;
  }

  // Get all posts for an organization with comment and like counts
  static async getByOrganization(organizationId, userId, chapter = null) {
    let query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.image_path,
        p.user_id,
        p.created_at,
        u.name as user_name,
        u.role as user_role,
        u.profile_image as author_image,
        u.chapter as user_chapter,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) > 0 FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.organization_id = ?
    `;
    const params = [userId, organizationId];

    if (chapter) {
      query += ' AND (u.chapter = ? OR u.role = "admin")';
      params.push(chapter);
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  // Get all posts for a specific user within their organization
  static async getByUser(userId, organizationId) {
    const query = `
      SELECT 
        p.id,
        p.title,
        p.description,
        p.image_path,
        p.user_id,
        p.created_at,
        u.name as user_name,
        u.role as user_role,
        u.profile_image as author_image,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) > 0 FROM post_likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? AND p.organization_id = ?
      ORDER BY p.created_at DESC
    `;

    const [rows] = await pool.execute(query, [userId, userId, organizationId]);
    return rows;
  }

  // Get post by ID
  static async findById(postId) {
    const query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.role as user_role,
        u.profile_image as author_image,
        (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    const [rows] = await pool.execute(query, [postId]);
    return rows[0] || null;
  }

  // Get post by ID and organization (for security)
  static async findByIdAndOrganization(postId, organizationId) {
    const query = `
      SELECT p.*, u.name as user_name, u.profile_image as author_image
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.organization_id = ?
    `;

    const [rows] = await pool.execute(query, [postId, organizationId]);
    return rows[0] || null;
  }

  // Delete post
  static async delete(postId, userId, organizationId) {
    const query = `
      DELETE FROM posts
      WHERE id = ? AND user_id = ? AND organization_id = ?
    `;

    const [result] = await pool.execute(query, [postId, userId, organizationId]);
    return result.affectedRows > 0;
  }

  // Check if user owns the post
  static async isOwner(postId, userId) {
    const query = 'SELECT id FROM posts WHERE id = ? AND user_id = ?';
    const [rows] = await pool.execute(query, [postId, userId]);
    return rows.length > 0;
  }
}

module.exports = Post;

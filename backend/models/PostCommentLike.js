const { pool } = require('../config/database');

class PostCommentLike {
    // Toggle reaction on a comment
    static async toggle(postCommentId, userId, reactionType = 'like') {
        // Validate reaction type
        const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry'];
        if (!validReactions.includes(reactionType)) {
            reactionType = 'like';
        }

        // Check if user already reacted
        const [existing] = await pool.execute(
            'SELECT id, reaction_type FROM post_comment_likes WHERE post_comment_id = ? AND user_id = ?',
            [postCommentId, userId]
        );

        if (existing.length > 0) {
            // If same reaction, remove it (unlike)
            if (existing[0].reaction_type === reactionType) {
                await pool.execute(
                    'DELETE FROM post_comment_likes WHERE post_comment_id = ? AND user_id = ?',
                    [postCommentId, userId]
                );
                return { liked: false, reactionType: null };
            } else {
                // Update to new reaction type
                await pool.execute(
                    'UPDATE post_comment_likes SET reaction_type = ? WHERE post_comment_id = ? AND user_id = ?',
                    [reactionType, postCommentId, userId]
                );
                return { liked: true, reactionType };
            }
        } else {
            // Add new reaction
            await pool.execute(
                'INSERT INTO post_comment_likes (post_comment_id, user_id, reaction_type) VALUES (?, ?, ?)',
                [postCommentId, userId, reactionType]
            );
            return { liked: true, reactionType };
        }
    }

    // Get reaction summary for a comment
    static async getReactionSummary(postCommentId) {
        const [rows] = await pool.execute(
            `SELECT reaction_type, COUNT(*) as count 
             FROM post_comment_likes 
             WHERE post_comment_id = ? 
             GROUP BY reaction_type`,
            [postCommentId]
        );
        return rows;
    }

    // Get user's reaction for a comment
    static async getUserReaction(postCommentId, userId) {
        const [rows] = await pool.execute(
            'SELECT reaction_type FROM post_comment_likes WHERE post_comment_id = ? AND user_id = ?',
            [postCommentId, userId]
        );
        return rows.length > 0 ? rows[0].reaction_type : null;
    }

    // Get like count for a comment
    static async getCountByComment(postCommentId) {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as count FROM post_comment_likes WHERE post_comment_id = ?',
            [postCommentId]
        );
        return rows[0].count;
    }

    // Check if a specific user liked a specific comment
    static async hasUserLiked(postCommentId, userId) {
        const [rows] = await pool.execute(
            'SELECT id FROM post_comment_likes WHERE post_comment_id = ? AND user_id = ?',
            [postCommentId, userId]
        );
        return rows.length > 0;
    }
}

module.exports = PostCommentLike;

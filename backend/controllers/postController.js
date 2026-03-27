const Post = require('../models/Post');
const PostComment = require('../models/PostComment');
const PostLike = require('../models/PostLike');
const PostCommentLike = require('../models/PostCommentLike');
const Notification = require('../models/Notification');

// Create a new post
const createPost = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const { userId, organizationId } = req.user;
        const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : null;

        // Validation
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        // Create post
        console.log(`Attempting to create post for user ${userId} in org ${organizationId}`);
        const postId = await Post.create(organizationId, userId, title, description, imagePath);

        // Get the created post
        const post = await Post.findById(postId);

        // Broadcast notification
        try {
            // Get organization settings
            const Organization = require('../models/Organization');
            const org = await Organization.findById(organizationId);
            const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

            let chapterFilter = null;
            if (settings.postsChapterOnly) {
                const User = require('../models/User');
                const user = await User.findById(userId);
                if (user) {
                    chapterFilter = user.chapter;
                }
            }

            const User = require('../models/User');
            const actor = await User.findById(userId);
            const actorName = actor ? (actor.name || actor.first_name) : 'Someone';

            await Notification.broadcast(
                organizationId,
                `${actorName} posted: ${title}`,
                'post',
                userId, // exclude creator
                { postId: parseInt(postId) },
                chapterFilter
            );
        } catch (notifError) {
            console.error('Failed to broadcast post notification:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: post
        });
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create post',
            error: error.message
        });
    }

};

// Get all posts for organization
const getPosts = async (req, res, next) => {
    try {
        const { organizationId, userId, role } = req.user;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // Determine if chapter filtering is needed
        // Determine if chapter filtering is needed
        let chapterFilter = null;
        if (role !== 'admin' && role !== 'org_admin') {
            if (settings.postsChapterOnly) {
                const User = require('../models/User');
                const user = await User.findById(userId);
                if (user) {
                    chapterFilter = user.chapter;
                }
            } else if (role === 'chapter_admin') {
                // Same logic as Events - strict adherence to setting
            }
        }

        const posts = await Post.getByOrganization(organizationId, userId, chapterFilter);

        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        next(error);
    }
};

// Get personal posts for current user
const getMyPosts = async (req, res, next) => {
    try {
        const { userId, organizationId } = req.user;

        const posts = await Post.getByUser(userId, organizationId);

        res.status(200).json({
            success: true,
            data: posts
        });
    } catch (error) {
        next(error);
    }
};

// Delete post
const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId, organizationId } = req.user;

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user owns the post
        if (post.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }

        // Delete post
        await Post.delete(id, userId, organizationId);

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Update post
const updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const { userId, organizationId } = req.user;

        // Validation
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user owns the post
        if (post.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own posts'
            });
        }

        // Update post logic
        const query = 'UPDATE posts SET title = ?, description = ? WHERE id = ?';
        const { pool } = require('../config/database');
        await pool.execute(query, [title, description, id]);

        const updatedPost = await Post.findById(id);

        res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            data: updatedPost
        });
    } catch (error) {
        next(error);
    }
};

// Add comment to post
const addComment = async (req, res, next) => {
    try {
        const { id } = req.params; // post ID
        const { comment } = req.body;
        const { userId, organizationId } = req.user;

        // Validation
        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment cannot be empty'
            });
        }

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Create comment
        const commentId = await PostComment.create(id, userId, comment);

        // Get the created comment
        const newComment = await PostComment.findById(commentId);

        // Create notification if user is not the post author
        if (post.user_id != userId) {
            try {
                const User = require('../models/User');
                const actor = await User.findById(userId);
                const actorName = actor ? (actor.name || actor.first_name) : 'Someone';

                const postTitle = post.title || (post.description ? (post.description.substring(0, 20) + '...') : 'your post');

                await Notification.create(
                    post.user_id,
                    organizationId,
                    `${actorName} commented on: ${postTitle}`,
                    'post_comment',
                    {
                        postId: parseInt(id),
                        commentId: newComment.id,
                        comment: comment.length > 50 ? comment.substring(0, 50) + '...' : comment,
                        actorId: userId,
                        actorName: actorName,
                        actorImage: actor ? actor.profile_image : null
                    }
                );
            } catch (notifError) {
                console.error('Failed to create comment notification:', notifError);
            }
        }

        // Check for @mentions and send reply notifications
        try {
            const User = require('../models/User');
            const actor = await User.findById(userId);
            const actorName = actor ? (actor.name || actor.first_name) : 'Someone';

            // Extract potential @mentions from comment
            // This regex captures the '@' and then a sequence of words that could be a name
            const mentionRegex = /@([A-Za-z0-9\s]+)/g;
            const matches = [...comment.matchAll(mentionRegex)];

            if (matches.length > 0) {
                const { pool } = require('../config/database');
                const notifiedUsers = new Set(); // Prevent duplicate notifications for same mention

                for (const match of matches) {
                    const fullMatchString = match[1].trim();
                    if (!fullMatchString) continue;

                    // Split into words and try matching from longest to shortest
                    const words = fullMatchString.split(/\s+/);
                    let foundUser = null;

                    // Try matching the longest possible name (up to 4 words)
                    for (let i = Math.min(words.length, 4); i > 0; i--) {
                        const potentialName = words.slice(0, i).join(' ');

                        const [users] = await pool.execute(
                            `SELECT id FROM users 
                             WHERE organization_id = ? 
                             AND (name = ? OR CONCAT(first_name, ' ', last_name) = ?)
                             AND id != ?
                             LIMIT 1`,
                            [organizationId, potentialName, potentialName, userId]
                        );

                        if (users.length > 0) {
                            foundUser = users[0];
                            break;
                        }
                    }

                    if (foundUser && !notifiedUsers.has(foundUser.id)) {
                        notifiedUsers.add(foundUser.id);

                        // Create reply notification
                        await Notification.create(
                            foundUser.id,
                            organizationId,
                            `${actorName} mentioned you in a comment`,
                            'comment_reply',
                            {
                                postId: parseInt(id),
                                commentId: newComment.id,
                                comment: comment.length > 50 ? comment.substring(0, 50) + '...' : comment,
                                actorId: userId,
                                actorName: actorName,
                                actorImage: actor ? actor.profile_image : null
                            }
                        );
                    }
                }
            }
        } catch (notifError) {
            console.error('Failed to create mention notification:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: newComment
        });
    } catch (error) {
        next(error);
    }
};

// Get comments for a post
const getComments = async (req, res, next) => {
    try {
        const { id } = req.params; // post ID
        const { organizationId } = req.user;

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Get comments
        const comments = await PostComment.getByPost(id, req.user.userId);

        res.status(200).json({
            success: true,
            data: comments
        });
    } catch (error) {
        next(error);
    }
};

// Delete comment
const deleteComment = async (req, res, next) => {
    try {
        const { postId, commentId } = req.params;
        const { userId, organizationId } = req.user;

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(postId, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if comment exists
        const comment = await PostComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Check if user owns the comment
        if (comment.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own comments'
            });
        }

        // Delete comment
        await PostComment.delete(commentId, userId);

        res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Like/Unlike post (toggle)
const toggleLike = async (req, res, next) => {
    try {
        const { id } = req.params; // post ID
        const { userId, organizationId } = req.user;

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Toggle like
        const result = await PostLike.toggle(id, userId);

        // Get updated like count
        const likeCount = await PostLike.getCountByPost(id);

        // Create or update aggregated notification if post was liked and user is not the post author
        if (result.liked && post.user_id != userId) {
            try {
                const User = require('../models/User');
                const actor = await User.findById(userId);
                const actorName = actor ? (actor.name || actor.first_name) : 'Someone';

                const postTitle = post.title || (post.description ? (post.description.substring(0, 20) + '...') : 'your post');

                console.log(`[DEBUG] Attempting notification for like on post ${id}. Author: ${post.user_id}, Liker: ${userId}`);

                // Check for existing like notification for this post (within last 24 hours)
                const { pool } = require('../config/database');
                const [existingNotifs] = await pool.execute(
                    `SELECT id, data FROM notifications 
                     WHERE user_id = ? 
                     AND type = 'post_like' 
                     AND JSON_EXTRACT(data, '$.postId') = ?
                     AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [post.user_id, parseInt(id)]
                );

                if (existingNotifs.length > 0) {
                    // Update existing notification
                    const existingNotif = existingNotifs[0];
                    const existingData = typeof existingNotif.data === 'string' ? JSON.parse(existingNotif.data) : existingNotif.data;

                    // Get list of likers
                    let likers = existingData.likers || [];

                    // Add new liker if not already in list
                    if (!likers.find(l => l.id == userId)) {
                        likers.push({
                            id: userId,
                            name: actorName,
                            image: actor ? actor.profile_image : null
                        });
                    }

                    // Build message
                    let message;
                    if (likers.length === 1) {
                        message = `${likers[0].name} liked your post: ${postTitle}`;
                    } else if (likers.length === 2) {
                        message = `${likers[0].name} and ${likers[1].name} liked your post: ${postTitle}`;
                    } else {
                        const othersCount = likers.length - 2;
                        message = `${likers[0].name}, ${likers[1].name} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} liked your post: ${postTitle}`;
                    }

                    // Update notification
                    await pool.execute(
                        `UPDATE notifications 
                         SET message = ?, 
                             data = ?, 
                             is_read = FALSE,
                             created_at = NOW()
                         WHERE id = ?`,
                        [
                            message,
                            JSON.stringify({
                                postId: parseInt(id),
                                likers: likers,
                                postTitle: postTitle
                            }),
                            existingNotif.id
                        ]
                    );
                } else {
                    // Create new notification
                    await Notification.create(
                        post.user_id,
                        organizationId,
                        `${actorName} liked your post: ${postTitle}`,
                        'post_like',
                        {
                            postId: parseInt(id),
                            likers: [{
                                id: userId,
                                name: actorName,
                                image: actor ? actor.profile_image : null
                            }],
                            postTitle: postTitle
                        }
                    );
                }
            } catch (notifError) {
                console.error('Failed to create/update like notification:', notifError);
                // Don't fail the request if notification fails
            }
        }

        res.status(200).json({
            success: true,
            message: result.liked ? 'Post liked successfully' : 'Post unliked successfully',
            data: {
                postId: parseInt(id),
                userId,
                liked: result.liked,
                likeCount
            }
        });
    } catch (error) {
        next(error);
    }
};

// Unlike post
const unlikePost = async (req, res, next) => {
    try {
        const { id } = req.params; // post ID
        const { userId, organizationId } = req.user;

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Unlike post
        const success = await PostLike.unlike(id, userId);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or not liked by user'
            });
        }

        // Get updated like count
        const likeCount = await PostLike.getCountByPost(id);

        res.status(200).json({
            success: true,
            message: 'Post unliked successfully',
            data: {
                postId: parseInt(id),
                userId,
                liked: false,
                likeCount
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get likes for a post
const getLikes = async (req, res, next) => {
    try {
        const { id } = req.params; // post ID
        const { userId, organizationId } = req.user;

        // Check if post exists and belongs to user's organization
        const post = await Post.findByIdAndOrganization(id, organizationId);
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Get likes
        const likes = await PostLike.getByPost(id);
        const likeCount = likes.length;
        const currentUserLiked = await PostLike.hasUserLiked(id, userId);

        res.status(200).json({
            success: true,
            data: {
                postId: parseInt(id),
                likeCount,
                likes,
                currentUserLiked
            }
        });
    } catch (error) {
        next(error);
    }
};

// Like/Unlike comment (toggle)
const toggleCommentLike = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { userId, organizationId } = req.user;

        // Check if comment exists
        const comment = await PostComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        // Toggle like/reaction
        const { reactionType = 'like' } = req.body;
        const result = await PostCommentLike.toggle(commentId, userId, reactionType);

        // Get updated like count
        const likeCount = await PostCommentLike.getCountByComment(commentId);

        // Create or update aggregated notification if comment was liked and user is not the comment author
        if (result.liked && comment.user_id != userId) {
            try {
                // Find post to get context
                const post = await Post.findById(comment.post_id);

                const User = require('../models/User');
                const actor = await User.findById(userId);
                const actorName = actor ? (actor.name || actor.first_name) : 'Someone';

                const postTitle = post ? (post.title || (post.description ? (post.description.substring(0, 20) + '...') : 'post')) : 'post';

                // Check for existing comment like notification (within last 24 hours)
                const { pool } = require('../config/database');
                const [existingNotifs] = await pool.execute(
                    `SELECT id, data FROM notifications 
                     WHERE user_id = ? 
                     AND type = 'comment_like' 
                     AND JSON_EXTRACT(data, '$.commentId') = ?
                     AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [comment.user_id, parseInt(commentId)]
                );

                if (existingNotifs.length > 0) {
                    // Update existing notification
                    const existingNotif = existingNotifs[0];
                    const existingData = typeof existingNotif.data === 'string' ? JSON.parse(existingNotif.data) : existingNotif.data;

                    // Get list of likers
                    let likers = existingData.likers || [];

                    // Add new liker if not already in list
                    if (!likers.find(l => l.id == userId)) {
                        likers.push({
                            id: userId,
                            name: actorName,
                            image: actor ? actor.profile_image : null
                        });
                    }

                    // Build message
                    let message;
                    if (likers.length === 1) {
                        message = `${likers[0].name} liked your comment on: ${postTitle}`;
                    } else if (likers.length === 2) {
                        message = `${likers[0].name} and ${likers[1].name} liked your comment on: ${postTitle}`;
                    } else {
                        const othersCount = likers.length - 2;
                        message = `${likers[0].name}, ${likers[1].name} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} liked your comment on: ${postTitle}`;
                    }

                    // Update notification
                    await pool.execute(
                        `UPDATE notifications 
                         SET message = ?, 
                             data = ?, 
                             is_read = FALSE,
                             created_at = NOW()
                         WHERE id = ?`,
                        [
                            message,
                            JSON.stringify({
                                postId: comment.post_id,
                                commentId: parseInt(commentId),
                                likers: likers,
                                postTitle: postTitle
                            }),
                            existingNotif.id
                        ]
                    );
                } else {
                    // Create new notification
                    await Notification.create(
                        comment.user_id,
                        organizationId,
                        `${actorName} liked your comment on: ${postTitle}`,
                        'comment_like',
                        {
                            postId: comment.post_id,
                            commentId: parseInt(commentId),
                            likers: [{
                                id: userId,
                                name: actorName,
                                image: actor ? actor.profile_image : null
                            }],
                            postTitle: postTitle
                        }
                    );
                }
            } catch (notifError) {
                console.error('Failed to create/update comment like notification:', notifError);
            }
        }

        res.status(200).json({
            success: true,
            message: result.liked ? 'Comment liked successfully' : 'Comment unliked successfully',
            data: {
                commentId: parseInt(commentId),
                userId,
                liked: result.liked,
                likeCount
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPost,
    updatePost,
    getPosts,
    getMyPosts,
    deletePost,
    addComment,
    getComments,
    deleteComment,
    toggleLike,
    toggleCommentLike,
    unlikePost,
    getLikes
};

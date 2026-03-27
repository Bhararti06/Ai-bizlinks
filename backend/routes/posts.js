const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../utils/validation');
const { authenticate } = require('../middleware/auth');
const {
    createPost,
    getPosts,
    getMyPosts,
    deletePost,
    updatePost,
    addComment,
    getComments,
    deleteComment,
    toggleLike,
    toggleCommentLike,
    unlikePost,
    getLikes
} = require('../controllers/postController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for post image upload
const postStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/posts/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadPost = multer({
    storage: postStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = /image|video/.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and video (mp4) files are allowed'));
        }
    }
});

// Post routes
router.post(
    '/',
    authenticate,
    uploadPost.single('image'),
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        validate
    ],
    createPost
);

router.get('/me', authenticate, getMyPosts);
router.get('/', authenticate, getPosts);
router.delete('/:id', authenticate, deletePost);

router.put(
    '/:id',
    authenticate,
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        validate
    ],
    updatePost
);

// Comment routes
router.post(
    '/:id/comments',
    authenticate,
    [
        body('comment').trim().notEmpty().withMessage('Comment cannot be empty'),
        validate
    ],
    addComment
);

router.get('/:id/comments', authenticate, getComments);
router.delete('/:postId/comments/:commentId', authenticate, deleteComment);

// Like routes
router.post('/:id/like', authenticate, toggleLike);
router.post('/comments/:commentId/like', authenticate, toggleCommentLike);
router.delete('/:id/like', authenticate, unlikePost);
router.get('/:id/likes', authenticate, getLikes);

module.exports = router;

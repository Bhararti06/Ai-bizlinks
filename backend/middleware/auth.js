const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please provide a valid token.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.user = {
            userId: decoded.id || decoded.userId, // Handle both id (from login) and userId formats
            organizationId: decoded.organizationId,
            role: decoded.role,
            email: decoded.email,
            chapter: decoded.chapter
        };

        // Support chapter_admin acting as a member
        const activeRoleHeader = req.headers['x-active-role'];
        if (req.user.role === 'chapter_admin' && activeRoleHeader === 'member') {
            req.user.role = 'member';
            req.user.originalRole = 'chapter_admin';
        }

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please login again.'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication failed.'
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    // Allow admin, chapter_admin, or super_admin roles
    if (req.user.role !== 'admin' && req.user.role !== 'chapter_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin or Chapter Admin access required. You do not have permission to perform this action.'
        });
    }

    next();
};

// Middleware to check if user is admin or chapter admin
const requireChapterAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    // Allow admin, chapter_admin, or super_admin roles
    if (req.user.role !== 'admin' && req.user.role !== 'chapter_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Chapter Admin or higher access required.'
        });
    }

    next();
};

// Middleware to check if user is authenticated (admin, chapter_admin, member, or super_admin)
const requireMember = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    const permittedRoles = ['admin', 'chapter_admin', 'member', 'super_admin'];
    if (!permittedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied.'
        });
    }

    next();
};

// Middleware to check if user is Super Admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    // Check for super_admin role or super admin email
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@bizlinks.in';

    if (req.user.role !== 'super_admin' && req.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
            success: false,
            message: 'Super Admin access required.'
        });
    }

    next();
};

module.exports = {
    authenticate,
    requireAdmin,
    requireChapterAdmin,
    requireMember,
    requireSuperAdmin
};

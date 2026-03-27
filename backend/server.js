const express = require('express');
const path = require('path');
const cors = require('cors');
const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const meetingRoutes = require('./routes/meetings');
const notificationRoutes = require('./routes/notifications');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    console.log(`REQUEST_LOG: ${req.method} ${req.url}`);
    next();
});
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Keep for backward compat

// Health check route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Community Portal API is running',
        version: '1.0.0'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is healthy',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/references', require('./routes/references'));
app.use('/api/events', require('./routes/events'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/master', require('./routes/masterData'));
app.use('/api/chapters', require('./routes/chapters'));
app.use('/api/chapter-meetings', require('./routes/chapterMeetings'));
app.use('/api/files', require('./routes/files'));
app.use('/api/deactivation-requests', require('./routes/deactivationRequests'));
app.use('/api/push', require('./routes/pushRoutes'));

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await testConnection();

        if (!dbConnected) {
            console.error('Failed to connect to database. Please check your database configuration.');
            console.error('Make sure MySQL is running and the credentials in .env are correct.');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log('=================================');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 API URL: http://localhost:${PORT}/api`);
            console.log('=================================');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;

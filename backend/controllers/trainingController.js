const Training = require('../models/Training');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs').promises;

// Create a new training
const createTraining = async (req, res, next) => {
    try {
        const { organizationId } = req.user;
        const trainingData = req.body;

        // Validation
        if (!trainingData.training_title || !trainingData.trainer_name) {
            return res.status(400).json({
                success: false,
                message: 'Training title and trainer name are required'
            });
        }

        if (!trainingData.training_start_date || !trainingData.training_end_date) {
            return res.status(400).json({
                success: false,
                message: 'Training start and end dates are required'
            });
        }

        if (!trainingData.training_mode) {
            return res.status(400).json({
                success: false,
                message: 'Training mode is required'
            });
        }

        // Handle image upload if present
        let imagePath = null;
        if (req.file) {
            imagePath = `/uploads/trainings/${req.file.filename}`;
        }

        // Create training
        const trainingId = await Training.create(organizationId, {
            ...trainingData,
            created_by: req.user.userId, // Use userId from req.user
            image_path: imagePath
        });

        // Get the created training
        const training = await Training.findById(trainingId, organizationId);

        // Broadcast notification to all organization members
        try {
            // Get organization settings
            const Organization = require('../models/Organization');
            const org = await Organization.findById(organizationId);
            const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

            let chapterFilter = null;
            if (settings.trainingChapterOnly) {
                const User = require('../models/User');
                const user = await User.findById(req.user.userId);
                if (user) {
                    chapterFilter = user.chapter;
                }
            }

            await Notification.broadcast(
                organizationId,
                `New training scheduled: ${trainingData.training_title}`,
                'training',
                req.user.userId, // exclude the creator
                null, // data
                chapterFilter // chapter
            );
        } catch (notifError) {
            console.error('Failed to broadcast training notification:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Training scheduled successfully',
            data: training
        });
    } catch (error) {
        next(error);
    }
};

const getTrainings = async (req, res, next) => {
    try {
        const { organizationId, role, userId } = req.user;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // Determine if chapter filtering is needed
        // Determine if chapter filtering is needed
        let chapterFilter = null;
        if (role !== 'admin' && role !== 'org_admin') {
            if (settings.trainingChapterOnly) {
                const User = require('../models/User');
                const user = await User.findById(userId);
                if (user) {
                    chapterFilter = user.chapter;
                }
            } else if (role === 'chapter_admin') {
                // strict setting adherence
            }
        }

        const trainings = await Training.getByOrganization(organizationId, chapterFilter);

        res.status(200).json({
            success: true,
            data: trainings
        });
    } catch (error) {
        next(error);
    }
};

// Get training by ID
const getTrainingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        const training = await Training.findById(id, organizationId);

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        res.status(200).json({
            success: true,
            data: training
        });
    } catch (error) {
        next(error);
    }
};

// Register for a training
const registerForTraining = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId, organizationId } = req.user;

        // Get training details to check for payment link
        const training = await Training.findById(id, organizationId);
        if (!training) {
            return res.status(404).json({ success: false, message: 'Training not found' });
        }

        // Register user with payment link if training has charges
        await Training.registerUser(id, userId, training.payment_link);

        // Send notification to training creator (chapter admin)
        if (training.created_by && training.created_by != userId) {
            try {
                const User = require('../models/User');
                const registrant = await User.findById(userId);
                const registrantName = registrant ? (registrant.name || registrant.first_name) : 'Someone';

                await Notification.create(
                    training.created_by,
                    organizationId,
                    `${registrantName} registered for your training: ${training.training_title}`,
                    'training_registration',
                    {
                        trainingId: parseInt(id),
                        trainingTitle: training.training_title,
                        registrantId: userId,
                        registrantName: registrantName,
                        registrantImage: registrant ? registrant.profile_image : null,
                        redirectTo: 'training_registrations' // For frontend to know where to redirect
                    }
                );
            } catch (notifError) {
                console.error('Failed to create training registration notification:', notifError);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Successfully registered for the training',
            data: {
                payment_required: training.training_charges > 0,
                payment_link: training.payment_link
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get users registered for a training
const getTrainingRegistrants = async (req, res, next) => {
    try {
        const { id } = req.params;
        const registrants = await Training.getRegistrants(id);

        res.status(200).json({
            success: true,
            data: registrants
        });
    } catch (error) {
        next(error);
    }
};

// Delete training
const deleteTraining = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        // Get training to delete image file
        const training = await Training.findById(id, organizationId);
        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        // Delete training
        const deleted = await Training.delete(id, organizationId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Training not found or already deleted'
            });
        }

        // Delete image file if exists
        if (training.image_path) {
            try {
                const imagePath = path.join(__dirname, '..', 'public', training.image_path);
                await fs.unlink(imagePath);
            } catch (err) {
                // Image file might not exist, continue anyway
                console.error('Error deleting image:', err);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Training deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Confirm payment for training registration
const confirmTrainingPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;

        await Training.confirmPayment(id, userId);

        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get payment status for training registration
const getTrainingPaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;

        const paymentStatus = await Training.getPaymentStatus(id, userId);

        res.status(200).json({
            success: true,
            data: paymentStatus
        });
    } catch (error) {
        next(error);
    }
};

// External registration (for non-members)
const registerExternalForTraining = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, contact, contact_number, company_name, chapter, payment_confirmed } = req.body;

        // Get training details - need to find by ID without organizationId for public access
        const { pool } = require('../config/database');
        const [rows] = await pool.execute('SELECT * FROM trainings WHERE id = ?', [id]);
        const training = rows[0];

        if (!training) {
            return res.status(404).json({ success: false, message: 'Training not found' });
        }

        const visitorData = {
            name,
            email,
            contact: contact || contact_number,
            contact_number: contact_number || contact,
            company_name,
            chapter,
            registered_for: training.training_title,
            payment_status: payment_confirmed ? 'completed' : 'pending',
            payment_confirmed: payment_confirmed || false
        };

        await Training.registerExternal(id, training.organization_id, visitorData);

        res.status(200).json({
            success: true,
            message: 'Successfully registered for the training'
        });
    } catch (error) {
        next(error);
    }
};



// Get single training by ID (public access)
const getPublicTrainingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { pool } = require('../config/database');
        const [rows] = await pool.execute('SELECT * FROM trainings WHERE id = ?', [id]);
        const training = rows[0];

        if (!training) {
            return res.status(404).json({
                success: false,
                message: 'Training not found'
            });
        }

        res.status(200).json({
            success: true,
            data: training
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTraining,
    getTrainings,
    getTrainingById,
    deleteTraining,
    registerForTraining,
    getTrainingRegistrants,
    confirmTrainingPayment,
    getTrainingPaymentStatus,
    registerExternalForTraining,
    getPublicTrainingById
};

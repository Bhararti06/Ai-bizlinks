const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { isValidEmail, isStrongPassword } = require('../utils/validation');

// Register a new organization with admin user
const registerOrganization = async (req, res, next) => {
    try {
        const { organizationName, adminName, adminEmail, subDomain, contact, settings } = req.body;

        // Validation - password no longer required
        if (!organizationName || !adminName || !adminEmail || !subDomain) {
            return res.status(400).json({
                success: false,
                message: 'Organization name, admin name, admin email, and sub domain are required'
            });
        }

        if (!isValidEmail(adminEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if organization name or admin email already exists in organizations table
        const orgExists = await Organization.exists(organizationName, adminEmail);
        if (orgExists) {
            return res.status(409).json({
                success: false,
                message: 'Organization name or admin email already exists'
            });
        }

        // Also check if admin email already exists in users table (important!)
        const userExists = await User.emailExists(adminEmail);
        if (userExists) {
            return res.status(409).json({
                success: false,
                message: 'Admin email is already registered as a user'
            });
        }

        // Create organization
        let organizationId;
        try {
            organizationId = await Organization.create(organizationName, adminName, adminEmail, subDomain, contact, settings);
        } catch (orgError) {
            if (orgError.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Sub Domain already exists'
                });
            }
            console.error('Failed to create organization:', orgError);
            throw orgError;
        }

        // Create admin user without password (will set on first login)
        try {
            const adminId = await User.create(
                organizationId,
                adminName,
                adminEmail,
                null, // No password yet
                'admin',
                'approved', // Admin is approved immediately
                null, // chapter
                null, // firstName
                null, // lastName
                null, // contactNumber
                null, // yearsInBusiness
                false // password_set = false
            );
            console.log('Organization and admin created successfully:', organizationId, adminId);

            res.status(201).json({
                success: true,
                message: 'Organization registered successfully. Admin will set password on first login.',
                data: {
                    organizationId,
                    adminId,
                    organizationName,
                    adminEmail
                }
            });
            console.log('Response sent to client');
        } catch (userError) {
            console.error('Failed to create admin user, rolling back organization creation:', userError);
            // Cleanup: delete the partially created organization
            await Organization.delete(organizationId).catch(err => console.error('Failed to cleanup organization:', err));
            throw userError;
        }
    } catch (error) {
        console.error('Registration controller error:', error);
        next(error);
    }
};

// Register a new user (member)
const registerUser = async (req, res, next) => {
    try {
        const { organizationName, name, email, chapter } = req.body;

        // Validation - password is no longer required
        if (!organizationName || !name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Organization name, name, and email are required'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if organization exists - Try multiple lookup strategies
        let organization = null;

        console.log('--- USER REGISTRATION DEBUG ---');
        console.log('Lookup with subDomain:', req.body.subDomain);
        console.log('Lookup with organizationName:', organizationName);

        // Strategy 1: strict lookup if subDomain is provided
        if (req.body.subDomain) {
            organization = await Organization.findByIdentifier(req.body.subDomain);
            if (organization) console.log('Found organization via subDomain identifier:', organization.id, organization.name);
        }

        // Strategy 2: lookup by name if not found yet
        if (!organization && organizationName) {
            organization = await Organization.findByName(organizationName);
            if (organization) console.log('Found organization via name lookup:', organization.id, organization.name);
        }

        // Strategy 3: fallback - try treating organizationName as subDomain or vice versa
        if (!organization && organizationName) {
            organization = await Organization.findByIdentifier(organizationName);
            if (organization) console.log('Found organization via identifier fallback lookup:', organization.id, organization.name);
        }

        if (!organization) {
            console.error('REGISTRATION_DEBUG: Organization not found for:', organizationName, req.body.subDomain);
            return res.status(404).json({
                success: false,
                message: 'Organization not found. Please check the name and try again.'
            });
        }
        console.log('REGISTRATION_DEBUG: Organization validated:', organization.id);

        // Check if email already exists
        console.log('REGISTRATION_DEBUG: Checking email existence:', email);
        const emailExists = await User.emailExists(email);
        console.log('REGISTRATION_DEBUG: Email existence checked:', emailExists);
        if (emailExists) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create user with NO password (will be set after approval)
        const { firstName, lastName, contactNumber, yearsInBusiness } = req.body;
        console.log('Creating user in DB with status: pending');
        const userId = await User.create(
            organization.id,
            name || `${firstName} ${lastName}`,
            email,
            null, // No password yet
            'member',
            'pending',
            chapter,
            firstName,
            lastName,
            contactNumber,
            yearsInBusiness,
            false // password_set = false
        );
        console.log(`REGISTRATION_DEBUG: User created successfully with ID: ${userId}`);

        // 1. Send success response IMMEDIATELY
        res.status(201).json({
            success: true,
            message: 'Registration successful. You will receive an email once your account is approved.',
            data: { userId, name, email, organizationId: organization.id, status: 'pending' }
        });
        console.log('REGISTRATION_DEBUG: 201 response sent to client');

        // 2. Perform notifications in background
        (async () => {
            try {
                console.log('REGISTRATION_DEBUG: Starting background notifications');
                const Notification = require('../models/Notification');
                const { sendEmail, emailTemplates } = require('../services/emailService');

                // In-app notification
                await Notification.notifyAdmins(
                    organization.id,
                    `New registration request: ${name} wants to join.`,
                    'approval',
                    { path: '/admin/membership-requests' }
                );
                console.log('REGISTRATION_DEBUG: In-app notification sent');

                // Email notification
                if (organization.admin_email) {
                    const emailData = emailTemplates.newMemberNotification(organization.admin_name || 'Admin', name, email);
                    await sendEmail(organization.admin_email, emailData.subject, emailData.html);
                    console.log('REGISTRATION_DEBUG: Email notification sent');
                }
            } catch (notiError) {
                console.error('REGISTRATION_DEBUG: Background notification failed:', notiError);
            }
        })();
    } catch (error) {
        console.error('REGISTRATION_DEBUG: Registration controller error:', error);
        next(error);
    }
};

// Login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // --- STRICT ORGANIZATION ISOLATION ---
        const { org } = req.body; // Organization subDomain/identifier

        // Skip organization check for superadmin
        const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@bizlinks.in';
        const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || user.role === 'super_admin';

        if (org && !isSuperAdmin) {
            const Organization = require('../models/Organization');
            const targetOrg = await Organization.findByIdentifier(org);

            if (!targetOrg || user.organization_id !== targetOrg.id) {
                return res.status(403).json({
                    success: false,
                    message: `This account does not belong to ${org}. Please use your correct organization login link.`
                });
            }
        }
        // -------------------------------------

        // Check if user is approved
        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval by the organization admin'
            });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been rejected'
            });
        }

        if (user.status === 'deleted') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deleted. Please contact your administrator.'
            });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact your administrator.'
            });
        }

        // Check if password has been set
        if (!user.password_set) {
            return res.status(403).json({
                success: false,
                message: 'PASSWORD_NOT_SET',
                requirePasswordSetup: true,
                userId: user.id,
                email: user.email
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                chapter: user.chapter,
                organizationId: user.organization_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        let organizationLogo = null;
        let namingConvention = {};

        console.log('User Org Settings Type:', typeof user.organization_settings);
        if (user.organization_settings) {
            try {
                const settings = typeof user.organization_settings === 'string'
                    ? JSON.parse(user.organization_settings)
                    : user.organization_settings;
                organizationLogo = settings.logo || null;
                namingConvention = settings.naming_convention || {};
            } catch (e) {
                console.error('Error parsing organization settings:', e);
            }
        }

        // Return user data (without password)
        const userData = {
            ...user, // Include all fields from DB
            organizationId: user.organization_id,
            organizationName: user.organization_name,
            organizationLogo: organizationLogo,
            subDomain: user.organization_sub_domain,
            profileImage: user.profile_image,
            mobile: user.contact_number,
            createdAt: user.created_at,
            namingConvention: namingConvention
        };

        // Remove sensitive fields
        delete userData.password;
        delete userData.password_set;
        delete userData.organization_settings;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: userData
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create password for approved user (first-time setup)
const createPassword = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const passwordCheck = isStrongPassword(password);
        if (!passwordCheck.valid) {
            return res.status(400).json({
                success: false,
                message: passwordCheck.message
            });
        }

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is approved
        if (user.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your account must be approved before setting a password'
            });
        }

        // Check if password has already been set
        if (user.password_set) {
            return res.status(400).json({
                success: false,
                message: 'Password has already been set. Please use the login page.'
            });
        }

        // Hash password and save
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.setPassword(user.id, hashedPassword);

        res.status(200).json({
            success: true,
            message: 'Password created successfully. You can now login.'
        });
    } catch (error) {
        next(error);
    }
};

// Validate email for two-step login (Step 1)
const validateEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        console.log('REGISTRATION_DEBUG: Validating email:', email);

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            console.log('REGISTRATION_DEBUG: No user found for:', email);
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address'
            });
        }
        console.log('REGISTRATION_DEBUG: User found for validation, status:', user.status);

        // Check if user is approved
        if (user.status === 'pending') {
            console.log('REGISTRATION_DEBUG: User is pending, sending 403');
            return res.status(403).json({
                success: false,
                message: 'Your account is pending approval by the organization admin'
            });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been rejected'
            });
        }

        if (user.status === 'deleted') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deleted. Please contact your administrator.'
            });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact your administrator.'
            });
        }

        // Return user status (do NOT return sensitive information)
        res.status(200).json({
            success: true,
            data: {
                email: user.email,
                name: user.name,
                passwordSet: user.password_set,
                organizationName: user.organization_name
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerOrganization,
    registerUser,
    login,
    createPassword,
    validateEmail
};

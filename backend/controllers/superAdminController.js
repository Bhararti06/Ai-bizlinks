const Organization = require('../models/Organization');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { isValidEmail, isStrongPassword } = require('../utils/validation');

// Get Dashboard Stats
const getDashboardStats = async (req, res, next) => {
    try {
        console.log('Admin Dashboard: Fetching stats...');
        console.log('Calling Organization.getAll()...');
        const organizations = await Organization.getAll();
        console.log(`Organization.getAll() returned ${organizations.length} orgs`);
        const totalOrganizations = organizations.length;

        // Count total members across all organizations
        // Since we don't have a direct count method for all users, we'll query directly or sum up
        // User.countByOrganization counts for specific org.
        // Let's use a direct query via pool if possible, or iterate (less efficient).
        // Best to add a method to User model, but I can't modify schema. I can modify User model code (class) though.

        // For now, let's just get count of all users who are not super admin (if any) or just all users.
        const { pool } = require('../config/database');
        console.log('Executing user count query...');
        const [userRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
        console.log('User count query finished');
        const totalMembers = userRows[0].count;

        res.status(200).json({
            success: true,
            data: {
                totalOrganizations,
                totalMembers
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get All Organizations
const getAllOrganizations = async (req, res, next) => {
    try {
        const organizations = await Organization.getAll();

        const formattedOrgs = organizations.map(org => {
            const subDomain = org.sub_domain || org.name.toLowerCase().replace(/\s+/g, '-');
            const link = `https://${subDomain}.bizlinks.in/register-user?org=${subDomain}`;

            return {
                ...org,
                signupLink: link,
                link // keep legacy if needed
            };
        });

        res.status(200).json({
            success: true,
            data: formattedOrgs
        });
    } catch (error) {
        next(error);
    }
};

// Create Organization (Super Admin version)
const createOrganization = async (req, res, next) => {
    try {
        const { organizationName, subDomain, adminName, adminEmail, contact, settings, password } = req.body;

        const finalPassword = password || Math.random().toString(36).slice(-8);

        // Validation
        if (!organizationName || !adminName || !adminEmail || !subDomain) {
            return res.status(400).json({
                success: false,
                message: 'Organization Name, Sub Domain, Admin Name, and Email are required.'
            });
        }

        // Logic similar to authController.registerOrganization
        // Check if organization name or admin email already exists in organizations table
        const orgExists = await Organization.exists(organizationName, adminEmail);
        if (orgExists) {
            return res.status(409).json({
                success: false,
                message: 'Organization name or admin email already exists'
            });
        }

        const userExists = await User.emailExists(adminEmail);
        if (userExists) {
            return res.status(409).json({
                success: false,
                message: 'Admin email is already registered as a user'
            });
        }

        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        let organizationId;
        try {
            organizationId = await Organization.create(organizationName, adminName, adminEmail, subDomain, contact, settings);
        } catch (orgError) {
            if (orgError.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Sub Domain already exists' // Simple check, might need more specific error handling if other keys dup
                });
            }
            throw orgError;
        }

        try {
            const adminId = await User.create(
                organizationId,
                adminName,
                adminEmail,
                hashedPassword,
                'admin',
                'approved',
                null, // chapter
                adminName.split(' ')[0], // First name guess
                adminName.split(' ')[1] || '', // Last name guess
                contact, // Contact number maps to contactNumber in User.create
                null // yearsInBusiness
            );

            // Construct the link
            const link = `https://${subDomain}.bizlinks.in/register-user?org=${subDomain}`;

            res.status(201).json({
                success: true,
                message: 'Organization created successfully.',
                data: {
                    organizationId,
                    adminId,
                    organizationName,
                    signupLink: link,
                    link,
                    adminEmail,
                    password: finalPassword
                }
            });
        } catch (userError) {
            // Cleanup
            await Organization.delete(organizationId).catch(console.error);
            throw userError;
        }

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    getAllOrganizations,
    createOrganization
};

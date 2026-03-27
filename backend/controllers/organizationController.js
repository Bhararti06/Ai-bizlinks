
const Organization = require('../models/Organization');

// Get all organizations (Public)
const getOrganizations = async (req, res, next) => {
    try {
        const organizations = await Organization.getAll();

        // Return only necessary public info
        const publicOrgs = organizations.map(org => ({
            id: org.id,
            name: org.name,
            sub_domain: org.sub_domain
        }));

        res.status(200).json({
            success: true,
            data: publicOrgs
        });
    } catch (error) {
        next(error);
    }
};

// Get Organization Settings (Admin only)
const getSettings = async (req, res, next) => {
    try {
        let orgId = req.user.organizationId;

        // Allow Super Admin to override
        if (req.user.role === 'super_admin' && req.query.id) {
            orgId = req.query.id;
        }

        console.log('--- GET SETTINGS DEBUG ---');
        console.log('Org ID:', orgId);

        const org = await Organization.findById(orgId);

        if (!org) {
            console.log('Organization not found in DB for ID:', orgId);
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        console.log('Organization found:', org.name);

        res.status(200).json({
            success: true,
            data: {
                name: org.name,
                admin_name: org.admin_name,
                admin_email: org.admin_email,
                contact_number: org.contact_number,
                sub_domain: org.sub_domain,
                settings: org.settings
            }
        });
    } catch (error) {
        next(error);
    }
};

// Update Organization Settings (Admin only)
const updateSettings = async (req, res, next) => {
    try {
        let orgId = req.user.organizationId;
        // Allow Super Admin to override
        if (req.user.role === 'super_admin' && req.body.organizationId) {
            orgId = req.body.organizationId;
        }

        const { name, admin_name, admin_email, contact_number, settings } = req.body;

        await Organization.update(orgId, {
            name,
            admin_name,
            admin_email,
            contact_number,
            settings
        });

        res.status(200).json({
            success: true,
            message: 'Organization settings updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get Public Organization Details (Branding)
const getPublicOrgDetails = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const org = await Organization.findByIdentifier(identifier);

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        res.status(200).json({
            success: true,
            data: {
                name: org.name,
                logo: settings.logo || null,
                gallery: settings.gallery || []
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getOrganizations,
    getSettings,
    updateSettings,
    getPublicOrgDetails
};

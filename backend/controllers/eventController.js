const Event = require('../models/Event');
const Notification = require('../models/Notification');

// Create a new event
const createEvent = async (req, res, next) => {
    try {
        const { organizationId, userId } = req.user;
        const eventData = req.body;

        // Map event_title to title for backward compatibility
        if (eventData.event_title && !eventData.title) {
            eventData.title = eventData.event_title;
        }

        const eventId = await Event.create(organizationId, userId, eventData);

        // Broadcast notification to all organization members
        try {
            // Get organization settings
            const Organization = require('../models/Organization');
            const org = await Organization.findById(organizationId);
            const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

            let chapterFilter = null;
            if (settings.eventsChapterOnly) {
                const User = require('../models/User');
                const user = await User.findById(userId);
                if (user) {
                    chapterFilter = user.chapter;
                }
            }

            await Notification.broadcast(
                organizationId,
                `New event scheduled: ${eventData.title}`,
                'event',
                userId, // exclude the creator
                null, // data
                chapterFilter // chapter
            );
        } catch (notifError) {
            console.error('Failed to broadcast event notification:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: { id: eventId, ...eventData }
        });
    } catch (error) {
        next(error);
    }
};

// Get all events for the organization
const getEvents = async (req, res, next) => {
    try {
        const { organizationId, role } = req.user;

        // Get organization settings
        const Organization = require('../models/Organization');
        const org = await Organization.findById(organizationId);
        const settings = typeof org.settings === 'string' ? JSON.parse(org.settings || '{}') : (org.settings || {});

        // Determine if chapter filtering is needed
        let chapterFilter = null;
        if (role !== 'admin' && role !== 'org_admin') {
            if (settings.eventsChapterOnly) {
                const User = require('../models/User');
                const user = await User.findById(req.user.userId);
                if (user) {
                    chapterFilter = user.chapter;
                }
            } else if (role === 'chapter_admin') {
                // If setting is OFF, does chapter admin see ALL events or just theirs?
                // The prompt says: "Events Post Display Within Chapter Only (Y/N)"
                // OFF -> "Chapter Admin events visible across the organization"
                // This implies when OFF, visibility is broad.
                // However, existing logic might have restricted chapter admins.
                // We should respect the setting primarily.
                // If setting is FALSE, we do NOT set chapterFilter, so they see all.
                // But wait, existing code had:
                /*
                if (settings.eventsChapterOnly === true && role !== 'admin') { ... }
                */
                // Use strict logic:
                // If eventsChapterOnly is TRUE -> Filter by chapter for everyone (except admin).
                // If eventsChapterOnly is FALSE -> Do not filter (show all).
            }
        }

        const events = await Event.findByOrganization(organizationId, chapterFilter);

        // Check registration status for each event for the current user
        const eventsWithStatus = await Promise.all(events.map(async (event) => {
            const isRegistered = await Event.isRegistered(event.id, req.user.userId);
            return { ...event, is_registered: isRegistered };
        }));

        res.status(200).json({
            success: true,
            data: eventsWithStatus
        });
    } catch (error) {
        next(error);
    }
};

// Delete an event
const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        await Event.delete(id);
        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Register for an event
const registerForEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId, organizationId } = req.user;

        // Get event details to check for payment link
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Register user with payment link if event has charges
        await Event.registerUser(id, userId, event.payment_link);

        // Send notification to event creator (chapter admin)
        if (event.created_by && event.created_by != userId) {
            try {
                const User = require('../models/User');
                const registrant = await User.findById(userId);
                const registrantName = registrant ? (registrant.name || registrant.first_name) : 'Someone';

                await Notification.create(
                    event.created_by,
                    organizationId,
                    `${registrantName} registered for your event: ${event.title}`,
                    'event_registration',
                    {
                        eventId: parseInt(id),
                        eventTitle: event.title,
                        registrantId: userId,
                        registrantName: registrantName,
                        registrantImage: registrant ? registrant.profile_image : null,
                        redirectTo: 'event_registrations' // For frontend to know where to redirect
                    }
                );
            } catch (notifError) {
                console.error('Failed to create event registration notification:', notifError);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Successfully registered for the event',
            data: {
                payment_required: event.event_charges > 0,
                payment_link: event.payment_link
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get users registered for an event
const getEventRegistrants = async (req, res, next) => {
    try {
        const { id } = req.params;
        const registrants = await Event.getRegistrants(id);

        res.status(200).json({
            success: true,
            data: registrants
        });
    } catch (error) {
        next(error);
    }
};

// Confirm payment for event registration
const confirmEventPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;

        await Event.confirmPayment(id, userId);

        res.status(200).json({
            success: true,
            message: 'Payment confirmed successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get payment status for event registration
const getEventPaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.user;

        const paymentStatus = await Event.getPaymentStatus(id, userId);

        res.status(200).json({
            success: true,
            data: paymentStatus
        });
    } catch (error) {
        next(error);
    }
};

// External registration (for non-members)
const registerExternalForEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, contact, contact_number, company_name, chapter, payment_confirmed } = req.body;

        // Get event details
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const visitorData = {
            name,
            email,
            contact: contact || contact_number,
            contact_number: contact_number || contact,
            company_name,
            chapter,
            registered_for: event.title,
            payment_status: payment_confirmed ? 'completed' : 'pending',
            payment_confirmed: payment_confirmed || false
        };

        await Event.registerExternal(id, event.organization_id, visitorData);

        res.status(200).json({
            success: true,
            message: 'Successfully registered for the event'
        });
    } catch (error) {
        next(error);
    }
};

// Get single event by ID (public access)
const getPublicEventById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createEvent,
    getEvents,
    deleteEvent,
    registerForEvent,
    getEventRegistrants,
    confirmEventPayment,
    getEventPaymentStatus,
    registerExternalForEvent,
    getPublicEventById
};

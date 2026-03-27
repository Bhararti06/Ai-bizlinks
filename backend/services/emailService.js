const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Send email helper
const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME || 'Community Portal'}" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

// Templates
const emailTemplates = {
    // Notify Admin about new registration
    newMemberNotification: (adminName, memberName, memberEmail) => ({
        subject: 'New Member Registration Pending Approval',
        html: `
      <h2>Hello ${adminName},</h2>
      <p>A new member has registered and is waiting for your approval.</p>
      <p><strong>Name:</strong> ${memberName}</p>
      <p><strong>Email:</strong> ${memberEmail}</p>
      <p>Please log in to the admin dashboard to approve or reject this request.</p>
      <br>
      <p>Best regards,<br>Community Portal Team</p>
    `
    }),

    // Notify User about approval
    accountApproved: (memberName, organizationName) => ({
        subject: 'Your Account Has Been Approved!',
        html: `
      <h2>Hello ${memberName},</h2>
      <p>Great news! Your account for <strong>${organizationName}</strong> has been approved.</p>
      <p>You can now log in and access the community portal.</p>
      <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login">Login Here</a>
      <br><br>
      <p>Best regards,<br>Community Portal Team</p>
    `
    }),

    // Notify User about rejection
    accountRejected: (memberName, organizationName) => ({
        subject: 'Account Registration Update',
        html: `
      <h2>Hello ${memberName},</h2>
      <p>We regret to inform you that your registration request for <strong>${organizationName}</strong> has been declined.</p>
      <p>If you believe this is an error, please contact the organization administrator directly.</p>
      <br>
      <p>Best regards,<br>Community Portal Team</p>
    `
    }),

    // Notify Members about new meeting
    meetingScheduled: (title, date, link) => ({
        subject: `New Meeting: ${title}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>New Meeting Scheduled</h2>
                <p>A new meeting has been scheduled for your organization.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">${title}</h3>
                    <p><strong>Date & Time:</strong> ${new Date(date).toLocaleString()}</p>
                    ${link ? `<p><strong>Link:</strong> <a href="${link}">${link}</a></p>` : ''}
                </div>
                <p>Login to the portal to view details and RSVP.</p>
                <br>
                <p>Best regards,<br>Community Portal Team</p>
            </div>
        `
    }),

    // Admin Credentials
    adminCredentials: (name, email, password, organizationName) => ({
        subject: `Welcome to ${organizationName} - Admin Access`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>Welcome ${name}!</h2>
                <p>You have been added as an administrator for <strong>${organizationName}</strong>.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Login Email:</strong> ${email}</p>
                    <p><strong>Temporary Password:</strong> ${password}</p>
                </div>
                <p>Please log in and change your password immediately for security.</p>
                <a href="${process.env.CORS_ORIGIN || 'http://localhost:3000'}/login" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Login to Portal</a>
                <br><br>
                <p>Best regards,<br>Community Portal Team</p>
            </div>
        `
    })
};

module.exports = {
    sendEmail,
    emailTemplates
};

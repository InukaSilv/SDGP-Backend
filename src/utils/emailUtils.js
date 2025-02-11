
const nodemailer = require('nodemailer');

// Configure the email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email
 * @param {Object} options - Options for sending email
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email content in HTML format
 */
const sendEmail = async ({ email, subject, html }) => {
  try {
    const mailOptions = {
      from: `"RiVVE Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error(`Failed to send email: ${err.message}`);
    throw new Error('Email could not be sent');
  }
};

module.exports = {
  sendEmail,
};

const cron = require('node-cron');
const { generateMonthlyReport } = require('./utils/reportGenerator');
const nodemailer = require('nodemailer');
const User = require('./models/User');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Schedule the task to run on the 1st of every month
cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('Running monthly report generation...');

    // Fetch all premium landlords
    const landlords = await User.find({ role: 'Landlord', isPremium: true });

    for (const landlord of landlords) {
      // Generate the report
      const reportPath = await generateMonthlyReport(
        landlord._id,
        new Date().getMonth() + 1, // Month (1-12)
        new Date().getFullYear()   // Year
      );

      // Email options
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: landlord.email,
        subject: 'Monthly Rental Performance Report',
        text: 'Please find attached the monthly report for your property.',
        attachments: [
          {
            filename: 'Monthly_Report.pdf',
            path: reportPath,
          },
        ],
      };

      // Send the email
      await transporter.sendMail(mailOptions);
      console.log(`Report sent to ${landlord.email}`);
    }
  } catch (error) {
    console.error('Error generating or sending reports:', error);
  }
});

console.log('Scheduler started. Waiting for the 1st of the month...');
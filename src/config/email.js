// config/email.js
const nodemailer = require("nodemailer");
const exphbs = require("nodemailer-express-handlebars");
const path = require("path");

// Create a transporter
const transporter = nodemailer.createTransport({
  service: "Gmail", // Use your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Configure handlebars for email templates
transporter.use(
  "compile",
  exphbs({
    viewEngine: {
      extname: ".handlebars",
      partialsDir: path.resolve("./views/emails"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views/emails"),
    extName: ".handlebars",
  })
);

module.exports = transporter;

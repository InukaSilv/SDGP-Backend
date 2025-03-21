const nodemailer = require("nodemailer");
const exphbs = require("express-handlebars");
const path = require("path");

// Create a transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Configure handlebars
const handlebars = exphbs.create({
  extname: ".handlebars",
  partialsDir: path.resolve(__dirname, "../views/email"),
  defaultLayout: false,
});

// Function to render email templates
const renderTemplate = async (templateName, context) => {
  const templatePath = path.resolve(__dirname, `../views/email/${templateName}.handlebars`);
  return handlebars.render(templatePath, context);
};

module.exports = { transporter, renderTemplate };
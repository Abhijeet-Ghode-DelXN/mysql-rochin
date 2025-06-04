const nodemailer = require('nodemailer');

/**
 * Send an email using nodemailer with Gmail SMTP
 */
const sendEmail = async (options) => {
  try {
    // Create transporter with Gmail SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL || 'prajalshete.delxn@gmail.com',
        pass: process.env.SMTP_PASSWORD || 'nwbf mxjg dccn dwcd'
      }
    });

    // Define email options
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'Multi-tenant'}" <${process.env.FROM_EMAIL || 'prajalshete.delxn@gmail.com'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Message sent:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

module.exports = sendEmail;
// api/newsletter.js
import 'dotenv/config';
const nodemailer = require('nodemailer');

// Use environment variables for SMTP credentials
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // Email options
  const mailOptions = {
    from: `PARA! <${SMTP_USER}>`,
    to: email,
    subject: 'Welcome to PARA! Newsletter',
    html: `<h2>Thank you for subscribing!</h2><p>You'll be the first to know about new features and updates.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Newsletter email error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};

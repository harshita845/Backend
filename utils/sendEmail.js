const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      auth: {
        user: process.env.EMAIL_USER || 'placeholder',
        pass: process.env.EMAIL_PASS || 'placeholder',
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"E Mediclub" <no-reply@emediclub.com>',
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || `<p>${options.message}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Email sending failed: ${error.message}`);
    // Do not throw the error to prevent application crash, just log it.
    return null;
  }
};

module.exports = sendEmail;

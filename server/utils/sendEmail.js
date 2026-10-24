const nodemailer = require('nodemailer');
const sendEmail = async (to, subject, text) => {
  try {
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
    if(!user || !pass){
      console.log(`[DEV-OTP] To:${to} | ${text}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
    await transporter.sendMail({ from: user, to, subject, text });
    console.log('Email sent to', to);
  } catch(e) {
    console.log(`[DEV-OTP FALLBACK] To:${to} | ${text} | Error:${e.message}`);
    // throw korbo na, jate signup na atke
  }
};
module.exports = sendEmail;

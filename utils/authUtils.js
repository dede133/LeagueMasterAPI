
const crypto = require('crypto');
const nodemailer = require('nodemailer');


function generateResetToken() {
  return crypto.randomBytes(32).toString('hex'); 
}


async function sendResetEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Restablecimiento de contraseña',
    text: `Haz clic en el siguiente enlace para restablecer tu contraseña: http://localhost:5000/reset-password?token=${token}`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { generateResetToken, sendResetEmail };
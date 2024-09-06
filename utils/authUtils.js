
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Función para generar un token de restablecimiento de contraseña
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex'); // Genera un token aleatorio de 32 bytes
}

// Función para enviar el correo de restablecimiento
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
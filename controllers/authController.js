// controllers/authController.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
// authController.js

const { generateResetToken, sendResetEmail } = require('../utils/authUtils'); // Importa funciones desde authUtils.js

// Usa las funciones como antes


// Configurar la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Controlador para registrar un nuevo usuario
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Por favor, completa todos los campos' });
  }

  try {
    // Verificar si el usuario ya existe
    const userExistsQuery = 'SELECT * FROM users WHERE email = $1';
    const { rowCount } = await pool.query(userExistsQuery, [email]);

    if (rowCount > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar el nuevo usuario en la base de datos
    const insertUserQuery = `
      INSERT INTO users (name, email, password, user_role)
      VALUES ($1, $2, $3, $4) RETURNING user_id
    `;
    const { rows } = await pool.query(insertUserQuery, [name, email, hashedPassword, "user"]);

    // Crear la sesión de usuario
    req.session.user = {
      id: rows[0].user_id,
      name,
      email,
      user_role: "user"
    };

    // Enviar respuesta de éxito con la sesión creada
    res.status(201).json({ message: 'Usuario registrado con éxito', user: req.session.user });
  } catch (error) {
    console.error('Error en el servidor:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, proporciona un email y una contraseña' });
  }

  try {
    // Verificar si el usuario existe en la base de datos
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const user = rows[0];

    // Comparar la contraseña proporcionada con la almacenada
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Si la contraseña coincide, crea la sesión de usuario
    req.session.user = {
      id: user.user_id,
      name: user.name,
      email: user.email,
      user_role: user.user_role
    };

    console.log('Sesión creada:', req.session);

    // Enviar respuesta de éxito con la sesión creada
    res.json({ message: 'Inicio de sesión exitoso', user: req.session.user });
  } catch (error) {
    console.error('Error en el servidor:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ message: 'Error al cerrar la sesión.' });
    }
    res.clearCookie('connect.sid'); // Elimina la cookie de sesión
    res.json({ message: 'Sesión cerrada exitosamente.' });
  });
};

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  
  // Verifica si el correo existe en la base de datos
  const userQuery = 'SELECT * FROM users WHERE email = $1';
  const { rows } = await pool.query(userQuery, [email]);
  
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Correo no encontrado' });
  }

  // Genera un token de restablecimiento de contraseña
  const resetToken = generateResetToken(); // Implementa esta función
  const expirationDate = new Date(Date.now() + 3600000); // 1 hora de validez
  
  // Guarda el token y la fecha de expiración en la base de datos
  const insertTokenQuery = 'UPDATE users SET reset_token = $1, reset_token_expiration = $2 WHERE email = $3';
  await pool.query(insertTokenQuery, [resetToken, expirationDate, email]);
  
  // Enviar correo electrónico al usuario con el enlace de restablecimiento
  sendResetEmail(email, resetToken); // Implementa esta función para enviar correos

  res.json({ message: 'Se ha enviado un enlace de restablecimiento de contraseña a tu correo' });
};

exports.verifyResetToken = async (req, res) => {
  const { token } = req.query;
  
  // Verifica si el token es válido y no ha expirado
  const tokenQuery = 'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiration > NOW()';
  const { rows } = await pool.query(tokenQuery, [token]);
  
  if (rows.length === 0) {
    return res.status(400).json({ message: 'Token de restablecimiento inválido o expirado' });
  }

  res.json({ message: 'Token válido. Continúa para restablecer tu contraseña' });
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  
  // Verifica si el token es válido y no ha expirado
  const tokenQuery = 'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiration > NOW()';
  const { rows } = await pool.query(tokenQuery, [token]);
  
  if (rows.length === 0) {
    return res.status(400).json({ message: 'Token de restablecimiento inválido o expirado' });
  }

  // Encripta la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Actualiza la contraseña en la base de datos y elimina el token
  const updatePasswordQuery = 'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiration = NULL WHERE id = $2';
  await pool.query(updatePasswordQuery, [hashedPassword, rows[0].id]);

  res.json({ message: 'Contraseña restablecida con éxito' });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params; // Asume que el ID del usuario se pasa como parámetro en la URL

  try {
    // Verifica si el usuario existe
    const userQuery = 'SELECT * FROM users WHERE user_id = $1';
    const { rowCount } = await pool.query(userQuery, [id]);

    if (rowCount === 0) {
      console.warn('Usuario no encontrado:', id);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Elimina el usuario de la base de datos
    const deleteUserQuery = 'DELETE FROM users WHERE user_id = $1';
    await pool.query(deleteUserQuery, [id]);

    console.log('Usuario eliminado con éxito:', id);

    // Si el usuario está autenticado, destruir la sesión
    if (req.session.user && req.session.user.id === parseInt(id, 10)) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error al cerrar sesión después de eliminar el usuario:', err);
          return res.status(500).json({ message: 'Error al cerrar la sesión después de eliminar el usuario.' });
        }
        res.clearCookie('connect.sid'); // Elimina la cookie de sesión
        return res.json({ message: 'Usuario eliminado y sesión cerrada con éxito.' }); // Asegúrate de enviar la respuesta aquí
      });
    } else {
      // Si no hay sesión para destruir, simplemente responde con éxito
      return res.json({ message: 'Usuario eliminado con éxito.' });
    }
  } catch (error) {
    console.error('Error en el servidor al eliminar el usuario:', error.message);
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.checkUserAuth = async (req, res) => {
  // Ruta para verificar la autenticación
  console.log("Verificando la session de usuario")
    if (req.session && req.session.user) {
      console.log('Sesión activa:', req.session.user);
      return res.status(200).json({ isAuthenticated: true, user: req.session.user });
    } else {
      console.log('No hay sesión activa');
      return res.status(401).json({ isAuthenticated: false });
    }
  };
  

// authController.js
exports.getUserProfile = async (req, res) => {
  try {
    console.log('Petición para obtener perfil de usuario recibida');

    // Verificar si la sesión de usuario existe
    if (!req.session.user) {
      console.log('No hay sesión de usuario activa');
      return res.status(401).json({ message: 'No autenticado' });
    }

    console.log('Usuario autenticado, ID de usuario:', req.session.user.id);

    // Obtener el usuario autenticado desde la base de datos
    const userQuery = 'SELECT user_id, name, email FROM users WHERE user_id = $1';
    const { rows } = await pool.query(userQuery, [req.session.user.id]);

    if (rows.length === 0) {
      console.log('Usuario no encontrado en la base de datos');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('Usuario encontrado:', rows[0]);

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Error en el servidor al obtener el perfil del usuario:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

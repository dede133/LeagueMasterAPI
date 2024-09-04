// controllers/authController.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  const { name, email, password } = req.body; // Asegúrate de que estás extrayendo los campos correctos
  // Verificar que todos los campos necesarios están presentes
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
    const hashedPassword = await bcrypt.hash(password, salt); // Aquí puede estar el problema si password es undefined

    // Insertar el nuevo usuario en la base de datos
    const insertUserQuery = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3) RETURNING id
    `;
    const { rows } = await pool.query(insertUserQuery, [name, email, hashedPassword]);

    // Crear y firmar un token JWT
    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Enviar respuesta con el token
    res.status(201).json({ message: 'Usuario registrado con éxito', token });
  } catch (error) {
    console.error('Error en el servidor:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
  
    // Verificar que se recibieron el email y la contraseña
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
  
      // Si la contraseña coincide, crear y firmar un token JWT
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      // Devolver el token y la información del usuario (sin la contraseña)
      res.json({ message: 'Inicio de sesión exitoso', token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error('Error en el servidor:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  };
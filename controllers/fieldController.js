// src/controllers/fieldsController.js

const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

// Configurar la conexión a la base de datos PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Configuración de Multer para manejar la subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renombra el archivo para evitar conflictos
  },
});

const upload = multer({ storage }); // Middleware de Multer

// Controlador para añadir un nuevo campo
exports.addField = async (req, res) => {
  try {
    console.log('Datos recibidos:', req.body);
    console.log('Archivos recibidos:', req.files);
    console.log('Sesión activa:', req.session.user);

        // Obtener la información del usuario desde la sesión
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }
    
    const {
      name,
      latitude,
      longitude,
      address,
      field_type,
      field_info,
      features,
      availability,
    } = req.body;

    // Aquí transformamos las barras invertidas a barras normales
    const photoUrls = req.files.map((file) => file.path.replace(/\\/g, '/'));

    // Convertir valores vacíos a null
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    // Inserta el campo en la base de datos incluso con otros campos vacíos
      const insertFieldQuery = `
      INSERT INTO fields (name, latitude, longitude, address, field_type, field_info, photo_url, features, availability, owner_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *
    `;
    
    const values = [
      name, 
      lat, 
      lng, 
      address || null, 
      field_type || null, 
      field_info || null, 
      photoUrls || null, 
      features || null, 
      availability || null, 
      user.id // El ID del usuario autenticado
    ];
  

    const { rows } = await pool.query(insertFieldQuery, values);

    res.status(201).json({ message: 'Campo añadido con éxito', field: rows[0] });
  } catch (error) {
    console.error('Error al añadir el campo:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};


// Obtener los detalles de un campo por su ID
exports.getFieldById = async (req, res) => {
  const { id } = req.params; // Obtenemos el field_id de los parámetros de la URL

  try {
    const fieldQuery = 'SELECT * FROM fields WHERE field_id = $1';
    const { rows } = await pool.query(fieldQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Campo no encontrado' });
    }

    res.json({ field: rows[0] });
  } catch (error) {
    console.error('Error al obtener el campo:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Obtener todos los campos
exports.getAllFields = async (req, res) => {
  try {
    const fieldsQuery = 'SELECT * FROM fields';
    const { rows } = await pool.query(fieldsQuery);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay campos disponibles' });
    }

    res.json({ fields: rows });
  } catch (error) {
    console.error('Error al obtener los campos:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Obtener campos por el user_id (campos del usuario autenticado)
exports.getFieldsByUser = async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }

    const fieldsQuery = 'SELECT * FROM fields WHERE owner_user_id = $1';
    const { rows } = await pool.query(fieldsQuery, [user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No tienes campos disponibles' });
    }

    res.json({ fields: rows });
  } catch (error) {
    console.error('Error al obtener los campos del usuario:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};


// Exportar la configuración de Multer como middleware
exports.upload = upload;

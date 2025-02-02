

const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});

const upload = multer({ storage }); 


exports.addField = async (req, res) => {
  try {
    console.log('Datos recibidos:', req.body);
    console.log('Archivos recibidos:', req.files);
    console.log('Sesión activa:', req.session.user);

    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }

    const { name, latitude, longitude, address, field_type, field_info, services } = req.body;

    const photoUrls = req.files.map((file) => file.path.replace(/\\/g, '/'));

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    if (!name) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const insertFieldQuery = `
      INSERT INTO fields (name, latitude, longitude, address, field_type, field_info, services, photo_url, owner_user_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING field_id, name, address
    `;

    const values = [
      name,
      lat,
      lng,
      address || null,
      field_type || null,
      field_info || null,
      services || '[]',
      photoUrls.length ? photoUrls : null,
      user.id,
    ];

    const { rows } = await pool.query(insertFieldQuery, values);

    if (!rows.length) {
      return res.status(500).json({ message: 'Error al insertar en la base de datos' });
    }

    const field = rows[0];

    console.log('Campo añadido con éxito:', field);

    res.status(201).json({ message: 'Campo añadido con éxito', field });
  } catch (error) {
    console.error('Error al añadir el campo:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};




exports.getFieldById = async (req, res) => {
  const { id } = req.params; 

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



exports.upload = upload;

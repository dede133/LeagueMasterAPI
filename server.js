// server.js
const express = require('express');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Configurar variables de entorno
dotenv.config();

// Crear una instancia de la aplicación Express
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Configurar la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Probar la conexión a la base de datos
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('Conexión exitosa a la base de datos. Fecha y hora actuales:', res.rows[0].now);
  }
});

// Importar rutas
const authRoutes = require('./routes/auth');

// Usar rutas
app.use('/api/auth', authRoutes);

// Definir el puerto del servidor
const PORT = process.env.PORT || 5000;

// Iniciar el servidor
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

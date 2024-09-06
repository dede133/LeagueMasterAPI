require('dotenv').config(); // Cargar variables de entorno

const { Pool } = require('pg');

// Crear pool de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error conectando a la base de datos:', err.stack);
  }
  console.log('Conexión exitosa a la base de datos');
  release();
  pool.end();
});

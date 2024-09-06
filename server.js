require('dotenv').config(); // Cargar variables de entorno al inicio

const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const passport = require('./config/passport'); // Importa la configuración de Passport
const path = require('path'); // Requerido para enviar archivos

// Crear una instancia de la aplicación Express
const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Middleware para parsear solicitudes de formularios
app.use(express.urlencoded({ extended: true })); // Asegúrate de añadir esta línea

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


app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); // Continúa al siguiente middleware o ruta
});

// Configurar la sesión para usar con Passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

// Inicializar Passport y la sesión
app.use(passport.initialize());
app.use(passport.session());

// Ruta para servir el archivo de inicio de sesión
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Importar rutas
const authRoutes = require('./routes/auth');

// Usar rutas
app.use('/api/auth', authRoutes);

// Definir el puerto del servidor
const PORT = process.env.PORT || 5000;

// Iniciar el servidor
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


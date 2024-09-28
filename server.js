require('dotenv').config(); // Cargar variables de entorno al inicio

const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const passport = require('./config/passport'); // Importa la configuración de Passport
const path = require('path'); // Requerido para enviar archivos
const cors = require('cors'); // Importar CORS correctamente
const cookieParser = require('cookie-parser'); // Importar cookie-parser
const jwt = require('jsonwebtoken'); // Importar jsonwebtoken para verificar JWT


// Importar rutas
const authRoutes = require('./routes/auth');
const fieldRoutes = require('./routes/field');

// Crear una instancia de la aplicación Express
const app = express();

// Configurar CORS para permitir solicitudes desde tu frontend
app.use(cors({
  origin: 'http://localhost:3000', // Asegúrate de reemplazar esto con la URL de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  credentials: true, // Permitir cookies y credenciales
}));


// Middleware para parsear JSON
app.use(express.json());

// Middleware para manejar cookies
app.use(cookieParser());

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

app.use((req, res, next) => {
  console.log('Cookies recibidas:', req.headers.cookie);
  console.log('Sesión actual:', req.session);
  next();
});

// Inicializar Passport y la sesión
app.use(passport.initialize());
app.use(passport.session());

// Ruta para servir el archivo de inicio de sesión
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Verificar el token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET); // Verifica el JWT con tu secreto
  } catch (err) {
    console.error('Error al verificar el token:', err);
    throw new Error('Token inválido');
  }
};

// Ruta para verificar la autenticación
app.get('/api/check-auth', (req, res) => {
  // Verificar si hay una sesión activa
  if (req.session && req.session.user) {
    console.log('Sesión activa:', req.session.user);
    return res.status(200).json({ isAuthenticated: true, user: req.session.user });
  } else {
    console.log('No hay sesión activa');
    return res.status(401).json({ isAuthenticated: false });
  }
});

// Usar rutas
app.use('/api/auth', authRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/field', fieldRoutes);

// Definir el puerto del servidor
const PORT = process.env.PORT || 5000;

// Iniciar el servidor
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


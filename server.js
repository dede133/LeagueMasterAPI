require('dotenv').config(); 

const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const passport = require('./config/passport'); 
const path = require('path'); 
const cors = require('cors'); 
const cookieParser = require('cookie-parser'); 
const jwt = require('jsonwebtoken'); 


const authRoutes = require('./routes/auth');
const fieldRoutes = require('./routes/field');
const reservationRoutes = require('./routes/reservation');
const availabilityRoutes = require('./routes/availability');
const leagueRoutes = require('./routes/league');
const matchRoutes = require('./routes/match');


const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  credentials: true, 
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); 


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('Conexión exitosa a la base de datos. Fecha y hora actuales:', res.rows[0].now);
  }
});


app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); 
});


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


app.use(passport.initialize());
app.use(passport.session());

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET); 
  } catch (err) {
    console.error('Error al verificar el token:', err);
    throw new Error('Token inválido');
  }
};

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});


app.use('/api/auth', authRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/field', fieldRoutes);

app.use('/api/reservations', reservationRoutes);

app.use('/api/availability', availabilityRoutes);

app.use('/api/leagues', leagueRoutes);

app.use('/api/matches', matchRoutes);

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));


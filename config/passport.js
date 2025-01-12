const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const userQuery = 'SELECT * FROM users WHERE google_id = $1';
    const { rows } = await pool.query(userQuery, [profile.id]);

    if (rows.length > 0) {
      return done(null, rows[0]);
    } else {
      const insertUserQuery = `
        INSERT INTO users (name, email, google_id)
        VALUES ($1, $2, $3) RETURNING *
      `;
      const newUser = await pool.query(insertUserQuery, [profile.displayName, profile.emails[0].value, profile.id]);
      return done(null, newUser.rows[0]);
    }
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  console.log('Serializando usuario:', user);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  
  try {
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await pool.query(userQuery, [id]);

    if (rows.length > 0) {
      done(null, rows[0]);
    } else {
      done(new Error('Usuario no encontrado'), null);
    }
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;

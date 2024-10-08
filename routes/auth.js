const express = require('express');
const passport = require('../config/passport');
const { getUserProfile, registerUser, loginUser, logoutUser, deleteUser, checkUserAuth} = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta para iniciar sesión con Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Ruta de redirección después de la autenticación de Google
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // Redirigir al usuario al área protegida después del login exitoso
  res.redirect('/api/auth/ruta-protegida');
});

router.get('/user', getUserProfile);
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.delete('/user/:id', deleteUser); 
router.get('/check-auth', checkUserAuth);

router.get('/ruta-protegida', isAuthenticated, (req, res) => {
    res.json({ message: 'Acceso autorizado. Esta es una ruta protegida.' });
  });

module.exports = router;

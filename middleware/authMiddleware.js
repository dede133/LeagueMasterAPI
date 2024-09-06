const isAuthenticated = (req, res, next) => {
  console.log('Verificando autenticación. Sesión actual:', req.session); // Log para depuración

  // Verificar si hay un usuario autenticado con Passport
  if (req.isAuthenticated()) {
    console.log('Usuario autenticado con Passport:', req.user); // Confirmar usuario autenticado con Passport
    return next();
  }

  // Verificar si hay un usuario autenticado con el sistema de login propio
  if (req.session && req.session.user) {
    console.log('Usuario autenticado con el sistema de login propio:', req.session.user); // Confirmar usuario autenticado con login propio
    return next();
  }

  console.log('No hay sesión activa o usuario no autenticado'); // Si no hay sesión activa
  res.status(401).json({ message: 'No autorizado. Inicia sesión para acceder a esta ruta.' });
};

module.exports = { isAuthenticated };

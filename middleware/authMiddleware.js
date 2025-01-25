const isAuthenticated = (req, res, next) => {
  console.log('Verificando autenticación. Sesión actual:', req.session); 

  
  if (req.isAuthenticated()) {
    console.log('Usuario autenticado con Passport:', req.user); 
    return next();
  }

  
  if (req.session && req.session.user) {
    console.log('Usuario autenticado con el sistema de login propio:', req.session.user); 
    return next();
  }

  console.log('No hay sesión activa o usuario no autenticado'); 
  res.status(401).json({ message: 'No autorizado. Inicia sesión para acceder a esta ruta.' });
};

const checkRole = (role) => {
  return (req, res, next) => {
    const user = req.session.user;
    console.log('Verificando rol de usuario:', user); 

    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }

    if (user.user_role !== role) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
    }

    next(); 
  };
};

module.exports = { isAuthenticated, checkRole };

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');

  // Verificar si se proporcionó un token
  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adjuntar el usuario decodificado al objeto de solicitud
    next();
  } catch (error) {
    res.status(400).json({ message: 'Token no válido' });
  }
};

module.exports = authMiddleware;


const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/fieldController');

// Ruta para añadir un nuevo campo, usando Multer para manejar la subida de archivos
router.post('/add-field', fieldController.upload.array('photos'), fieldController.addField);

// Ruta para obtener todos los campos
router.get('/', fieldController.getAllFields);

router.get('/:id', fieldController.getFieldById);

module.exports = router;

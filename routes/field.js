
const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/fieldController');
const { checkRole } = require('../middleware/authMiddleware');


// Ruta para añadir un nuevo campo, usando Multer para manejar la subida de archivos
router.post('/add-field', checkRole('admin') ,  fieldController.upload.array('photos'), fieldController.addField);

router.get('/user-fields', fieldController.getFieldsByUser);

// Ruta para obtener todos los campos
router.get('/', fieldController.getAllFields);

router.get('/:id', fieldController.getFieldById);



module.exports = router;

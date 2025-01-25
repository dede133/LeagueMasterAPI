
const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/fieldController');
const { checkRole } = require('../middleware/authMiddleware');



router.post('/add-field', checkRole('admin') ,  fieldController.upload.array('photos'), fieldController.addField);

router.get('/user-fields', fieldController.getFieldsByUser);


router.get('/', fieldController.getAllFields);

router.get('/:id', fieldController.getFieldById);



module.exports = router;

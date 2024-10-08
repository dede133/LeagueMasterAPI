const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// Rutas relacionadas con la disponibilidad
router.post('/weekly', availabilityController.addOrUpdateWeeklyAvailability);
router.post('/blocked', availabilityController.addBlockedDate);
router.delete('/blocked/:blocked_id', availabilityController.deleteBlockedDate);
router.get('/:field_id', availabilityController.getAvailabilityAndBlockedDates);

module.exports = router;

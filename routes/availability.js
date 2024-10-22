const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// Rutas relacionadas con la disponibilidad
router.post('/weekly', availabilityController.addOrUpdateWeeklyAvailability);
router.post('/blocked', availabilityController.addBlockedDate);
router.delete('/blocked/:blocked_id', availabilityController.deleteBlockedDate);
router.get('/field/:field_id/availability', availabilityController.getWeeklyAvailability);
router.get('/field/:field_id/blocked-dates', availabilityController.getBlockedDatesByDate);

module.exports = router;

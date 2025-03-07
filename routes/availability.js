const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

router.post('/weekly', availabilityController.addOrUpdateWeeklyAvailability);
router.delete('/weekly/:field_id', availabilityController.deleteWeeklyAvailabilityBatch);
router.post('/blocked', availabilityController.addBlockedDate);
router.delete('/blocked', availabilityController.deleteBlockedDate);
router.get('/field/:field_id/availability', availabilityController.getWeeklyAvailability);
router.get('/field/:field_id/blocked-dates/by-date', availabilityController.getBlockedDatesByDate);
router.get('/field/:field_id/blocked-dates', availabilityController.getBlockedDates);


module.exports = router;

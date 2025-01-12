const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

router.post('/reservation', reservationController.makeReservation);
router.put('/cancel/:reservation_id', reservationController.cancelReservation)
router.put('/update-status/:reservation_id', reservationController.updateReservationStatus);
router.get('/field/:field_id', reservationController.getReservationsByField);
router.get('/field/:field_id/by-date', reservationController.getReservationsByFieldAndDate);
router.get('/user/:user_id', reservationController.getReservationsByUser);
router.delete('/cancel/:reservation_id', reservationController.cancelReservation);

module.exports = router;

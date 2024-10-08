const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Rutas relacionadas con las reservas
router.post('/make', reservationController.makeReservation);
router.delete('/cancel/:reservation_id', reservationController.cancelReservation);
router.put('/update-status/:reservation_id', reservationController.updateReservationStatus);

module.exports = router;

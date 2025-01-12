const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');



// Actualizar el estado de inscripción y pago de un equipo
router.put('/team/:team_id/status', teamController.updateTeamStatus);
// Añadir jugadores a un equipo
router.post('/teams/:team_id/players', teamController.addPlayer);

module.exports = router;

const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

// Obtener partidos por liga y fecha
router.get('/:league_id/matches', matchController.getMatchesByLeagueAndDate);

// Actualizar goles de un partido
router.post('/:match_id/update-score', matchController.updateScore);

module.exports = router;

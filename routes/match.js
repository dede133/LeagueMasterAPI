const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');


router.get('/:league_id/matches', matchController.getMatchesByLeagueAndDate);


router.post('/:match_id/update-score', matchController.updateScore);

module.exports = router;

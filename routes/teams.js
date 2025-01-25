const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');




router.put('/team/:team_id/status', teamController.updateTeamStatus);

router.post('/teams/:team_id/players', teamController.addPlayer);

module.exports = router;

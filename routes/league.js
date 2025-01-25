const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/leagueController');
const { checkRole } = require('../middleware/authMiddleware');


router.get('/owner-leagues', leagueController.getOwnerLeagues);
router.get('/user-leagues', leagueController.getUserLeagues);
router.get('/user-field-leagues', leagueController.getLeaguesByUserAndField);


router.post('/create', checkRole('admin'), leagueController.createLeague);
router.get('/', leagueController.getAllLeagues);

router.get('/:league_id', leagueController.getLeagueInfo);
router.get('/details/:league_id', leagueController.getLeagueDetails);
router.post('/:league_id/start', checkRole('admin'), leagueController.startLeague);
router.delete('/:league_id', leagueController.deleteLeague);


router.post('/add-team', leagueController.addTeamToLeague);
router.post('/:league_id/join', leagueController.createTeamWithPlayers);
router.get('/:league_id/teams', leagueController.getTeamsByLeague);


router.post('/:league_id/generate-links', leagueController.generateLeagueLink);
router.get('/:league_id/links', leagueController.getLeagueLinks); 


module.exports = router;

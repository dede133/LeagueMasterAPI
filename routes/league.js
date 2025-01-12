const express = require('express');
const router = express.Router();
const leagueController = require('../controllers/leagueController');

// Rutas relacionadas con ligas del usuario
router.get('/owner-leagues', leagueController.getOwnerLeagues);
router.get('/user-leagues', leagueController.getUserLeagues);
router.get('/user-field-leagues', leagueController.getLeaguesByUserAndField);

// Rutas de gestión general de ligas
router.post('/create', leagueController.createLeague);
router.get('/', leagueController.getAllLeagues);

// Rutas específicas para ligas (detalles, estadísticas, acciones)
router.get('/:league_id', leagueController.getLeagueInfo);
router.get('/details/:league_id', leagueController.getLeagueDetails);
router.post('/:league_id/start', leagueController.startLeague);
router.delete('/:league_id', leagueController.deleteLeague);

// Rutas relacionadas con equipos
router.post('/add-team', leagueController.addTeamToLeague);
router.post('/:league_id/join', leagueController.createTeamWithPlayers);
router.get('/:league_id/teams', leagueController.getTeamsByLeague);

// Rutas relacionadas con partidos
router.post('/:league_id/generate-links', leagueController.generateLeagueLink);
router.get('/:league_id/links', leagueController.getLeagueLinks); // Nueva ruta para obtener links asociados a una liga


module.exports = router;

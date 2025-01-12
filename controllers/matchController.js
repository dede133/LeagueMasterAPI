const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Configurar conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Actualizar goles de un partido
exports.updateScore = async (req, res) => {
  const { match_id } = req.params;
  const { home_team_score, away_team_score } = req.body;

  try {
    // Validar datos
    if (home_team_score === undefined || away_team_score === undefined) {
      return res.status(400).json({ message: 'Los goles deben estar definidos.' });
    }

    // Actualizar marcador en la base de datos
    await pool.query(
      `UPDATE matches SET home_team_score = $1, away_team_score = $2 WHERE match_id = $3`,
      [home_team_score, away_team_score, match_id]
    );

    res.status(200).json({ message: 'Marcador actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar el marcador:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.getMatchesByLeagueAndDate = async (req, res) => {
    const { league_id } = req.params; // ID de la liga
    const { date } = req.query; // Fecha pasada directamente como query param
  
    // Validar que se pase la fecha
    if (!date) {
      return res.status(400).json({ message: 'Se requiere una fecha para filtrar los partidos.' });
    }
  
    try {
      // Consulta para obtener los partidos por liga y fecha
      const query = `
        SELECT 
          m.match_id, 
          m.date, 
          m.time, 
          m.home_team_id, 
          m.away_team_id, 
          m.home_team_score, 
          m.away_team_score,
          ht.name AS home_team_name,
          at.name AS away_team_name
        FROM matches m
        LEFT JOIN teams ht ON m.home_team_id = ht.team_id
        LEFT JOIN teams at ON m.away_team_id = at.team_id
        WHERE m.league_id = $1 AND m.date = $2
        ORDER BY m.time;
      `;
  
      const { rows } = await pool.query(query, [league_id, date]);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'No se encontraron partidos para la fecha especificada.' });
      }
  
      res.status(200).json({ matches: rows });
    } catch (error) {
      console.error('Error al obtener partidos por liga y fecha:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  };
  
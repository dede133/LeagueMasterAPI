const { Pool } = require('pg');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


exports.updateTeamStatus = async (req, res) => {
    const { team_id } = req.params;
    const { status, payment_status } = req.body;
  
    try {
      const updateQuery = `
        UPDATE teams SET status = $1, payment_status = $2
        WHERE team_id = $3;
      `;
      await pool.query(updateQuery, [status, payment_status, team_id]);
  
      res.json({ message: 'Estado del equipo actualizado con éxito.' });
    } catch (error) {
      console.error('Error al actualizar el estado del equipo:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
  };
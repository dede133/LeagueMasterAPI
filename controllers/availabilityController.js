const { Pool } = require('pg');

// Configurar la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Añadir o actualizar disponibilidad semanal
exports.addOrUpdateWeeklyAvailability = async (req, res) => {
  const availabilityArray = req.body; // Recibir un array de días

  try {
    for (const availability of availabilityArray) {
      const { field_id, day_of_week, start_time, end_time, price = 60, available_durations = [60] } = availability;

      // Eliminar la disponibilidad anterior si existe
      await pool.query(
        `DELETE FROM weekly_availability 
         WHERE field_id = $1 AND day_of_week = $2`,
        [field_id, day_of_week]
      );

      // Insertar la nueva disponibilidad
      const insertAvailabilityQuery = `
        INSERT INTO weekly_availability 
        (field_id, day_of_week, start_time, end_time, price, available_durations) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
      `;
      const values = [field_id, day_of_week, start_time, end_time, price, available_durations];

      await pool.query(insertAvailabilityQuery, values);
    }

    res.status(200).json({ message: 'Disponibilidad semanal añadida/actualizada con éxito' });
  } catch (error) {
    console.error('Error al añadir/actualizar disponibilidad semanal:', error);
    res.status(500).json({ message: 'Error al añadir/actualizar disponibilidad semanal' });
  }
};


// Añadir fechas bloqueadas
exports.addBlockedDate = async (req, res) => {
  const blockedDatesArray = req.body; // Recibir un array de fechas bloqueadas
  console.log(req.body)
  try {
    for (const blockedDate of blockedDatesArray) {
      const { field_id, start_time, end_time, reason = '' } = blockedDate;

      // Insertar cada rango de fechas bloqueadas
      const insertBlockedDateQuery = `
        INSERT INTO blocked_dates (field_id, start_time, end_time, reason) 
        VALUES ($1, $2, $3, $4) RETURNING *;
      `;
      const values = [field_id, start_time, end_time, reason];

      await pool.query(insertBlockedDateQuery, values);
    }

    res.status(200).json({ message: 'Fechas bloqueadas añadidas con éxito' });
  } catch (error) {
    console.error('Error al añadir fechas bloqueadas:', error);
    res.status(500).json({ message: 'Error al añadir fechas bloqueadas' });
  }
};


// Eliminar una fecha bloqueada
exports.deleteBlockedDate = async (req, res) => {
  const { blocked_id } = req.params;

  try {
    await pool.query(
      `DELETE FROM blocked_dates WHERE blocked_id = $1`,
      [blocked_id]
    );

    res.status(200).json({ message: 'Fecha bloqueada eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar fecha bloqueada:', error);
    res.status(500).json({ message: 'Error al eliminar fecha bloqueada' });
  }
};

// Obtener disponibilidad semanal y fechas bloqueadas para un campo
exports.getAvailabilityAndBlockedDates = async (req, res) => {
  const { field_id } = req.params;

  try {
    // Obtener la disponibilidad semanal
    const weeklyAvailability = await pool.query(
      `SELECT * FROM weekly_availability WHERE field_id = $1`,
      [field_id]
    );

    // Obtener las fechas bloqueadas
    const blockedDates = await pool.query(
      `SELECT * FROM blocked_dates WHERE field_id = $1`,
      [field_id]
    );

    res.status(200).json({
      weeklyAvailability: weeklyAvailability.rows,
      blockedDates: blockedDates.rows,
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad y fechas bloqueadas:', error);
    res.status(500).json({ message: 'Error al obtener disponibilidad y fechas bloqueadas' });
  }
};

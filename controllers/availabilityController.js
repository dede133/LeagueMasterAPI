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
  console.log("avaiability", req.body)
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
  console.log(req.body);
  try {
    for (const blockedDate of blockedDatesArray) {
      const { field_id, start_time, end_time, reason = '' } = blockedDate;

      // Si end_time es null, asignar start_time a end_time
      const finalEndTime = end_time ? end_time : start_time;

      // Insertar cada rango de fechas bloqueadas
      const insertBlockedDateQuery = `
        INSERT INTO blocked_dates (field_id, start_time, end_time, reason) 
        VALUES ($1, $2, $3, $4) RETURNING *;
      `;
      const values = [field_id, start_time, finalEndTime, reason];

      await pool.query(insertBlockedDateQuery, values);
    }

    res.status(200).json({ message: 'Fechas bloqueadas añadidas con éxito' });
  } catch (error) {
    console.error('Error al añadir fechas bloqueadas:', error);
    res.status(500).json({ message: 'Error al añadir fechas bloqueadas' });
  }
};

// Eliminar una fecha bloqueada
// Eliminar fechas bloqueadas por rango
exports.deleteBlockedDate = async (req, res) => {
  const { field_id, start_time, end_time } = req.query;
  console.log(req.body)
  try {
    // Verificamos que se reciban las fechas
    if (!start_time) {
      return res.status(400).json({ message: 'Se requiere una fecha de inicio' });
    }

    // Si end_time es null, eliminamos solo la fecha específica de start_time
    const finalEndTime = end_time ? end_time : start_time;

    const deleteQuery = `
      DELETE FROM blocked_dates 
      WHERE field_id = $1 AND start_time = $2 AND end_time = $3;
    `;
    const values = [field_id, start_time, finalEndTime];

    const result = await pool.query(deleteQuery, values);

    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Fechas bloqueadas eliminadas con éxito' });
    } else {
      res.status(404).json({ message: 'No se encontraron fechas bloqueadas para eliminar' });
    }
  } catch (error) {
    console.error('Error al eliminar fechas bloqueadas:', error);
    res.status(500).json({ message: 'Error al eliminar fechas bloqueadas' });
  }
};



// Obtener disponibilidad semanal y fechas bloqueadas para un campo
exports.getWeeklyAvailability = async (req, res) => {
  const { field_id } = req.params;

  try {
    // Obtener la disponibilidad semanal
    const weeklyAvailability = await pool.query(
      `SELECT * FROM weekly_availability WHERE field_id = $1`,
      [field_id]
    );

    res.status(200).json({
      weeklyAvailability: weeklyAvailability.rows,
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad semanal:', error);
    res.status(500).json({ message: 'Error al obtener disponibilidad semanal' });
  }
};

exports.getBlockedDatesByDate = async (req, res) => {
  const { field_id } = req.params;
  const { start_date, end_date } = req.query; // Recibir las fechas por query

  try {
    // Obtener las fechas bloqueadas dentro de un rango de fechas
    const blockedDates = await pool.query(
      `SELECT * FROM blocked_dates WHERE field_id = $1 AND start_time >= $2 AND end_time <= $3`,
      [field_id, start_date, end_date]
    );

    res.status(200).json({
      blockedDates: blockedDates.rows,
    });
  } catch (error) {
    console.error('Error al obtener fechas bloqueadas:', error);
    res.status(500).json({ message: 'Error al obtener fechas bloqueadas' });
  }
};

exports.getBlockedDates = async (req, res) => {
  const { field_id } = req.params;
  try {
    // Obtener las fechas bloqueadas y renombrar las columnas en la consulta
    const blockedDates = await pool.query(
      `SELECT 
        blocked_id, 
        field_id, 
        start_time AS "from", 
        end_time AS "to", 
        reason 
      FROM blocked_dates 
      WHERE field_id = $1`,
      [field_id]
    );

    res.status(200).json({
      blockedDates: blockedDates.rows,
    });
  } catch (error) {
    console.error('Error al obtener fechas bloqueadas:', error);
    res.status(500).json({ message: 'Error al obtener fechas bloqueadas' });
  }
};


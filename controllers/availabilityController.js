const { Pool } = require('pg');


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


exports.addOrUpdateWeeklyAvailability = async (req, res) => {
  const availabilityArray = req.body; 
  console.log("avaiability", req.body)
  try {
    for (const availability of availabilityArray) {
      const { field_id, day_of_week, start_time, end_time, price = 60, available_durations = [60] } = availability;

      
      await pool.query(
        `DELETE FROM weekly_availability 
         WHERE field_id = $1 AND day_of_week = $2`,
        [field_id, day_of_week]
      );

      
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

exports.deleteWeeklyAvailabilityBatch = async (req, res) => {
  const { field_id } = req.params; 
  const daysToDelete = req.body; 

  try {
    for (const { day_of_week } of daysToDelete) {
      await pool.query(
        `DELETE FROM weekly_availability 
         WHERE field_id = $1 AND day_of_week = $2`,
        [field_id, day_of_week]
      );
    }

    res.status(200).json({ message: 'Disponibilidad semanal eliminada con éxito.' });
  } catch (error) {
    console.error('Error al eliminar la disponibilidad semanal:', error);
    res.status(500).json({ message: 'Error al eliminar la disponibilidad semanal.' });
  }
};

exports.addBlockedDate = async (req, res) => {
  const blockedDatesArray = req.body; 
  console.log(req.body);
  try {
    for (const blockedDate of blockedDatesArray) {
      const { field_id, start_time, end_time, reason = '' } = blockedDate;

      
      const finalEndTime = end_time ? end_time : start_time;

      
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

exports.deleteBlockedDate = async (req, res) => {
  const { field_id, start_time, end_time } = req.query;
  console.log(req.body)
  try {
    
    if (!start_time) {
      return res.status(400).json({ message: 'Se requiere una fecha de inicio' });
    }

    
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

exports.getWeeklyAvailability = async (req, res) => {
  const { field_id } = req.params;

  try {
    
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
  const { start_date, end_date } = req.query; 

  try {
    
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


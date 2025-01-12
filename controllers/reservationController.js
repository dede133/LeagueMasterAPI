// reservationController.js
const { Pool } = require('pg');

// Configurar la conexión a PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

exports.makeReservation = async (req, res) => {
    const { field_id, reservation_date, reservation_start_time, reservation_end_time } = req.body;
  
    const client = await pool.connect();
  
    try {
      // Verificar que el usuario esté autenticado
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
      }
  
      const user_id = user.id;
  
      await client.query('BEGIN');
  
      const blocked = await client.query(
        `SELECT * FROM blocked_dates 
         WHERE field_id = $1 
         AND ($2::timestamp, $3::timestamp) OVERLAPS (start_time, end_time)`,
        [field_id, reservation_date + ' ' + reservation_start_time, reservation_date + ' ' + reservation_end_time]
      );
  
      if (blocked.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'La franja horaria está bloqueada' });
      }
  
      const availability = await client.query(
        `SELECT * FROM weekly_availability 
         WHERE field_id = $1 AND day_of_week = $2 
         AND start_time <= $3 AND end_time >= $4`,
        [field_id, new Date(reservation_date).getDay(), reservation_start_time, reservation_end_time]
      );
      console.log(new Date(reservation_date).getDay())
      if (availability.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Franja horaria no disponible' });
      }
  
      await client.query(
        `INSERT INTO reservations (field_id, user_id, reservation_date, reservation_start_time, reservation_end_time, price, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'booked')`,
        [field_id, user_id, reservation_date, reservation_start_time, reservation_end_time, availability.rows[0].price]
      );
  
      await client.query('COMMIT');
  
      res.status(200).json({ message: 'Reserva realizada con éxito' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al realizar la reserva:', error);
      res.status(500).json({ message: 'Error al realizar la reserva' });
    } finally {
      client.release();
    }
};

// Cancelar una reserva
exports.cancelReservation = async (req, res) => {
  const { reservation_id } = req.params;

  try {
    await pool.query(`DELETE FROM reservations WHERE reservation_id = $1`, [reservation_id]);
    res.status(200).json({ message: 'Reserva cancelada con éxito' });
  } catch (error) {
    console.error('Error al cancelar la reserva:', error);
    res.status(500).json({ message: 'Error al cancelar la reserva' });
  }
};

// Actualizar estado de reserva (por ejemplo, pagado)
exports.updateReservationStatus = async (req, res) => {
  const { reservation_id } = req.params;
  const { status } = req.body;

  try {
    await pool.query(`UPDATE reservations SET status = $1 WHERE reservation_id = $2`, [status, reservation_id]);
    res.status(200).json({ message: 'Estado de reserva actualizado con éxito' });
  } catch (error) {
    console.error('Error al actualizar el estado de la reserva:', error);
    res.status(500).json({ message: 'Error al actualizar el estado de la reserva' });
  }
};

// Obtener reservas para un campo específico
exports.getReservationsByField = async (req, res) => {
  const { field_id } = req.params; // Obtener el field_id desde los parámetros de la URL

  const client = await pool.connect();

  try {
    // Obtener todas las reservas asociadas a un campo específico
    const reservations = await client.query(
      `SELECT * FROM reservations 
       WHERE field_id = $1
       ORDER BY reservation_date, reservation_start_time`,
      [field_id]
    );

    if (reservations.rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reservas para este campo' });
    }

    res.status(200).json(reservations.rows);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ message: 'Error al obtener las reservas' });
  } finally {
    client.release();
  }
};

// Obtener reservas por campo y fechas
exports.getReservationsByFieldAndDate = async (req, res) => {
  const { field_id } = req.params; // Obtener el field_id desde los parámetros de la URL
  const { start, end } = req.query; // Obtener las fechas desde los parámetros de la query (start y end)

  const client = await pool.connect();

  try {
    // Consultar las reservas que caen dentro del rango de fechas para el campo específico
    const reservations = await client.query(
      `SELECT * FROM reservations
       WHERE field_id = $1
       AND reservation_date >= $2
       AND reservation_date <= $3
       ORDER BY reservation_date, reservation_start_time`,
      [field_id, start, end]
    );

    // Si no se encuentran reservas, devolver un array vacío
    res.status(200).json(reservations.rows);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ message: 'Error al obtener las reservas' });
  } finally {
    client.release();
  }
};

exports.getReservationsByUser = async (req, res) => {
  const { user_id } = req.params;

  const client = await pool.connect();

  try {
    // Obtener solo las reservas futuras del usuario
    const currentDate = new Date().toISOString(); // fecha actual en UTC
    const reservations = await client.query(
      `SELECT * FROM reservations
       WHERE user_id = $1
       AND reservation_date >= $2
       ORDER BY reservation_date, reservation_start_time`,
      [user_id, currentDate]
    );

    res.status(200).json(reservations.rows);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ message: 'Error al obtener las reservas' });
  } finally {
    client.release();
  }
};

// src/controllers/reservationController.js

exports.cancelReservation = async (req, res) => {
  const { reservation_id } = req.params; // Obtener el ID de la reserva desde los parámetros de la URL

  const client = await pool.connect();

  try {
    const cancelQuery = `
      UPDATE reservations
      SET status = 'cancelled'
      WHERE reservation_id = $1
      RETURNING *;
    `;
    const values = [reservation_id];

    const result = await client.query(cancelQuery, values);

    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Reserva cancelada con éxito', reservation: result.rows[0] });
    } else {
      res.status(404).json({ message: 'No se encontró la reserva para cancelar' });
    }
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ message: 'Error al cancelar la reserva' });
  } finally {
    client.release();
  }
};

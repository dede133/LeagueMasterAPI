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

// Hacer una reserva
exports.makeReservation = async (req, res) => {
  const { user_id, field_id, reservation_date, reservation_start_time, reservation_end_time } = req.body;

  try {
    // Verificar si la franja está disponible y no bloqueada
    const availability = await pool.query(
      `SELECT * FROM weekly_availability 
       WHERE field_id = $1 AND day_of_week = $2 
       AND start_time <= $3 AND end_time >= $4`,
      [field_id, new Date(reservation_date).getDay() + 1, reservation_start_time, reservation_end_time]
    );

    if (availability.rows.length === 0) {
      return res.status(400).json({ message: 'Franja horaria no disponible' });
    }

    // Crear la reserva
    await pool.query(
      `INSERT INTO reservations (field_id, user_id, reservation_date, reservation_start_time, reservation_end_time, price, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'booked')`,
      [field_id, user_id, reservation_date, reservation_start_time, reservation_end_time, availability.rows[0].price]
    );

    res.status(200).json({ message: 'Reserva realizada con éxito' });
  } catch (error) {
    console.error('Error al realizar la reserva:', error);
    res.status(500).json({ message: 'Error al realizar la reserva' });
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

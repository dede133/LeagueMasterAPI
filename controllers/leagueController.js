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

// Crear una nueva liga
exports.createLeague = async (req, res) => {
    const { name, field_id, start_date, end_date, game_days, game_times } = req.body;
    const user = req.session.user;
  
    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }
  
    try {
      // Validar campos obligatorios
      if (!name || !field_id || !start_date || !end_date || !game_days || !Array.isArray(game_times) || game_times.length !== 2) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios y game_times debe tener inicio y fin.' });
      }
  
      const insertLeagueQuery = `
        INSERT INTO leagues (name, field_id, owner_id, start_date, end_date, game_days, game_times, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente') RETURNING *;
      `;
      const values = [
        name,
        field_id,
        user.id,
        start_date,
        end_date,
        game_days, // String directamente
        game_times, // Array de dos elementos
      ];
  
      const { rows } = await pool.query(insertLeagueQuery, values);
  
      res.status(201).json({ message: 'Liga creada con éxito', league: rows[0] });
    } catch (error) {
      console.error('Error al crear la liga:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
  
const distributeMatches = async (matches, league, insertMatchesQuery) => {
    const gameDays = Array.isArray(league.game_days) ? league.game_days : league.game_days.split(',');
    const normalizedDaysArray = gameDays.map((day) => day.toLowerCase());
    const gameTimes = league.game_times;
    const startDate = new Date(league.start_date);
    const endDate = new Date(league.end_date);
  
    const usedDates = new Set(); // Para rastrear fechas usadas por equipos
    let currentDayIndex = 0;
    let currentTimeIndex = 0;
  
    for (const match of matches) {
      let gameDate = new Date(startDate);
  
      // Encuentra el próximo día válido
      let safetyCounter = 0;
      while (
        (!normalizedDaysArray.includes(gameDate.toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase()) ||
          usedDates.has(`${match.home_team}-${gameDate.toDateString()}`) ||
          usedDates.has(`${match.away_team}-${gameDate.toDateString()}`)) &&
        gameDate <= endDate
      ) {
        gameDate.setDate(gameDate.getDate() + 1);
        safetyCounter++;
        if (safetyCounter > 100) {
          console.error('[LOG] No se encontraron días válidos para este partido.');
          throw new Error('No se encontraron días válidos para algunos partidos.');
        }
      }
  
      // Si no se encontró un día válido
      if (gameDate > endDate) {
        console.error('[LOG] No hay suficientes días disponibles para distribuir los partidos.');
        throw new Error('No hay suficientes días disponibles para distribuir los partidos.');
      }
  
      const gameTime = gameTimes[currentTimeIndex];
  
      console.log('[LOG] Insertando partido:', {
        league_id: league.league_id,
        home_team: match.home_team,
        away_team: match.away_team,
        field_id: league.field_id,
        gameDate,
        gameTime,
      });
  
      await pool.query(insertMatchesQuery, [
        league.league_id,
        match.home_team,
        match.away_team,
        league.field_id,
        gameDate,
        gameTime,
      ]);
  
      // Actualizar los índices y fechas usadas
      usedDates.add(`${match.home_team}-${gameDate.toDateString()}`);
      usedDates.add(`${match.away_team}-${gameDate.toDateString()}`);
      currentTimeIndex = (currentTimeIndex + 1) % gameTimes.length;
  
      // Si se agotaron los horarios, avanza al siguiente día válido
      if (currentTimeIndex === 0) {
        currentDayIndex = (currentDayIndex + 1) % normalizedDaysArray.length;
      }
    }
};
  
exports.startLeague = async (req, res) => {
    const { league_id } = req.params;
  
    try {
      console.log(`[LOG] Iniciando proceso para la liga con ID: ${league_id}`);
      
      // Obtener equipos de la liga
      console.log('[LOG] Obteniendo equipos de la liga...');
      const teamsQuery = 'SELECT * FROM teams WHERE league_id = $1;';
      const { rows: teams } = await pool.query(teamsQuery, [league_id]);
      console.log(`[LOG] Equipos obtenidos (${teams.length} equipos):`, teams);
  
      if (teams.length < 2) {
        return res.status(400).json({ message: 'Se necesitan al menos 2 equipos para iniciar la liga.' });
      }
  
      // Obtener datos de la liga
      console.log('[LOG] Obteniendo datos de la liga...');
      const leagueQuery = 'SELECT * FROM leagues WHERE league_id = $1;';
      const { rows: leagueRows } = await pool.query(leagueQuery, [league_id]);
  
      if (!leagueRows.length) {
        return res.status(404).json({ message: 'Liga no encontrada.' });
      }
  
      const league = leagueRows[0];
      console.log('[LOG] Datos de la liga obtenidos:', league);
  
      // Generar partidos
      console.log('[LOG] Generando partidos...');
      const matches = [];
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          // Ida
          matches.push({
            home_team: teams[i].team_id,
            away_team: teams[j].team_id,
          });
        }
      }
  
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          // Vuelta
          matches.push({
            home_team: teams[j].team_id,
            away_team: teams[i].team_id,
          });
        }
      }
      console.log(`[LOG] Partidos generados (${matches.length} partidos):`, matches);
  
      // Distribuir partidos en días y horarios
      console.log('[LOG] Distribuyendo partidos en días y horarios...');
      const insertMatchesQuery = `
        INSERT INTO matches (league_id, home_team_id, away_team_id, field_id, date, time, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pendiente');
      `;
      await distributeMatches(matches, league, insertMatchesQuery);
  
      // Cambiar estado de la liga a "empezada"
      console.log('[LOG] Cambiando estado de la liga a "empezada"...');
      const updateLeagueQuery = `
        UPDATE leagues SET status = 'empezada' WHERE league_id = $1;
      `;
      await pool.query(updateLeagueQuery, [league_id]);
  
      console.log('[LOG] Liga iniciada con éxito.');
      res.json({ message: 'Liga iniciada con éxito y partidos generados automáticamente.' });
    } catch (error) {
      console.error('[LOG] Error al iniciar la liga:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
  
  // Eliminar una liga y todos los datos relacionados
exports.deleteLeague = async (req, res) => {
    const { league_id } = req.params;
    const user = req.session.user;
  
    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }
  
    try {
      // Verificar que el usuario sea el propietario de la liga
      const checkLeagueQuery = 'SELECT * FROM leagues WHERE league_id = $1 AND owner_id = $2;';
      const { rows } = await pool.query(checkLeagueQuery, [league_id, user.id]);
  
      if (!rows.length) {
        return res.status(403).json({ message: 'No tienes permiso para eliminar esta liga.' });
      }
  
      // Eliminar la liga
      const deleteLeagueQuery = 'DELETE FROM leagues WHERE league_id = $1;';
      await pool.query(deleteLeagueQuery, [league_id]);
  
      res.json({ message: 'Liga eliminada con éxito.' });
    } catch (error) {
      console.error('Error al eliminar la liga:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
  
// Obtener ligas por usuario y campo
exports.getLeaguesByUserAndField = async (req, res) => {
    const { field_id } = req.query;
    const user = req.session.user;
  
    if (!user) {
      return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
    }
  
    if (!field_id) {
      return res.status(400).json({ message: 'El parámetro field_id es obligatorio.' });
    }
  
    try {
      const leaguesQuery = `
        SELECT * FROM leagues
        WHERE field_id = $1 AND owner_id = $2;
      `;
      const { rows } = await pool.query(leaguesQuery, [field_id, user.id]);
  
      res.json({ leagues: rows });
    } catch (error) {
      console.error('Error al obtener ligas por usuario y campo:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

exports.getLeagueInfo = async (req, res) => {
    const { league_id } = req.params;
  
    if (!league_id) {
      return res.status(400).json({ message: 'El parámetro league_id es obligatorio.' });
    }
  
    try {
      const leagueQuery = `
        SELECT 
          l.*, 
          f.photo_url
        FROM leagues l
        JOIN fields f ON l.field_id = f.field_id
        WHERE l.league_id = $1;
      `;
  
      const { rows } = await pool.query(leagueQuery, [league_id]);
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Liga no encontrada.' });
      }
  
      // Enviar solo la primera fila ya que buscamos una sola liga
      res.json({ league: rows[0] });
    } catch (error) {
      console.error('Error al obtener los detalles de la liga:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
  
exports.getAllLeagues = async (req, res) => {
    try {
      const leaguesQuery = `
        SELECT 
          leagues.*, 
          fields.photo_url, 
          fields.address
        FROM leagues
        LEFT JOIN fields ON leagues.field_id = fields.field_id;
      `;
      const { rows } = await pool.query(leaguesQuery);
  
      res.json({ leagues: rows });
    } catch (error) {
      console.error('Error al obtener las ligas y campos asociados:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};
  
// Obtener ligas creadas por el usuario autenticado
exports.getOwnerLeagues = async (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
  }

  try {
    console.log('User ID:', user.id); // Depurar el ID del usuario
    const userLeaguesQuery = 'SELECT * FROM leagues WHERE owner_id = $1;';
    const { rows } = await pool.query(userLeaguesQuery, [user.id]);

    res.json({ leagues: rows });
  } catch (error) {
    console.error('Error al obtener las ligas del usuario:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Obtener ligas asociadas al usuario como propietario de un equipo
exports.getUserLeagues = async (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
  }

  try {
    console.log('User ID:', user.id); // Depurar el ID del usuario

    // Consulta para obtener las ligas asociadas al usuario como propietario de un equipo
    const userLeaguesQuery = `
      SELECT DISTINCT 
        l.league_id AS league_id, 
        l.name AS league_name, 
        l.field_id, 
        l.owner_id AS league_owner_id,
        l.start_date, 
        l.end_date, 
        l.status, 
        l.game_days, 
        l.game_times
      FROM leagues l
      JOIN teams t ON t.league_id = l.league_id
      WHERE t.owner_id = $1;
    `;

    const { rows } = await pool.query(userLeaguesQuery, [user.id]);

    res.json({ leagues: rows });
  } catch (error) {
    console.error('Error al obtener las ligas del usuario:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Añadir equipo a una liga
exports.addTeamToLeague = async (req, res) => {
  const { league_id, name, captain_id } = req.body;

  if (!req.session.user) {
    return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
  }

  try {
    console.log('Agregando equipo a la liga:', league_id, name, captain_id);

    // Inserta el equipo en la tabla "teams"
    const insertTeamQuery = `
      INSERT INTO teams (league_id, name, captain_id)
      VALUES ($1, $2, $3) RETURNING *;
    `;
    const values = [league_id, name, captain_id];
    const { rows: teamRows } = await pool.query(insertTeamQuery, values);
    const newTeam = teamRows[0];
    console.log('Equipo añadido:', newTeam);

    // Inserta el equipo en la tabla "standings"
    const insertStandingQuery = `
      INSERT INTO standings (league_id, team_id, played, won, drawn, lost, goals_for, goals_against, points)
      VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0);
    `;
    const standingValues = [league_id, newTeam.team_id];
    const { rows: standingRows } = await pool.query(insertStandingQuery, standingValues);
    console.log('Clasificación actualizada para el equipo:', standingRows);

    res.status(201).json({ message: 'Equipo añadido con éxito', team: newTeam });
  } catch (error) {
    console.error('Error al añadir equipo:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

  // Obtener información detallada de una liga
exports.getLeagueDetails = async (req, res) => {
    const { league_id } = req.params;
  
    try {
      const leagueQuery = `
        SELECT * FROM leagues WHERE league_id = $1;
      `;
      const teamsQuery = `
        SELECT * FROM teams WHERE league_id = $1;
      `;
      const matchesQuery = `
      SELECT 
        m.*,
        TO_CHAR(m.date, 'YYYY-MM-DD') AS date, -- Formatea la fecha como 'YYYY-MM-DD'
        ht.name AS home_team_name, 
        at.name AS away_team_name
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.team_id
      LEFT JOIN teams at ON m.away_team_id = at.team_id
      WHERE m.league_id = $1
      ORDER BY m.date, m.time;
    `;
      const standingsQuery = `
        SELECT 
          s.*,
          t.name AS team_name
        FROM standings s
        JOIN teams t ON s.team_id = t.team_id
        WHERE s.league_id = $1
        ORDER BY s.points DESC, s.goal_difference DESC, s.goals_for DESC;
      `;
  
      // Ejecuta las consultas
      const league = await pool.query(leagueQuery, [league_id]);
      const teams = await pool.query(teamsQuery, [league_id]);
      const matches = await pool.query(matchesQuery, [league_id]);
      const standings = await pool.query(standingsQuery, [league_id]);
  
      // Verifica si la liga existe
      if (!league.rows.length) {
        return res.status(404).json({ message: 'Liga no encontrada' });
      }
  
      // Devuelve la respuesta con todos los datos
      res.json({
        league: league.rows[0],
        teams: teams.rows,
        matches: matches.rows,
        standings: standings.rows,
      });
    } catch (error) {
      console.error('Error al obtener detalles de la liga:', error.message);
      res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// Crear un equipo y añadir jugadores
exports.createTeamWithPlayers = async (req, res) => {
  const { league_id } = req.params;
  const { name, players } = req.body;

  // Obtener el usuario de la sesión
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ message: 'No autorizado. Inicia sesión para continuar.' });
  }

  if (!name || !players || players.length === 0) {
    return res.status(400).json({ message: 'Datos incompletos para crear el equipo.' });
  }

  try {
    // Iniciar una transacción
    await pool.query('BEGIN');

    // Crear equipo
    const createTeamQuery = `
      INSERT INTO teams (name, league_id, owner_id)
      VALUES ($1, $2, $3) RETURNING team_id;
    `;
    const teamResult = await pool.query(createTeamQuery, [name, league_id, user.id]);
    const teamId = teamResult.rows[0].team_id;

    console.log('Equipo creado con ID:', teamId);

    // Añadir jugadores al equipo
    const addPlayerQuery = `
      INSERT INTO players (team_id, name, dni, dorsal, phone)
      VALUES ($1, $2, $3, $4, $5);
    `;
    for (const player of players) {
      await pool.query(addPlayerQuery, [teamId, player.name, player.dni, player.dorsal, player.phone]);
    }

    console.log('Jugadores añadidos al equipo:', teamId);

    // Añadir el equipo a la tabla "standings"
    const insertStandingQuery = `
      INSERT INTO standings (league_id, team_id, played, won, drawn, lost, goals_for, goals_against, points)
      VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0);
    `;
    await pool.query(insertStandingQuery, [league_id, teamId]);

    console.log('Equipo añadido a la clasificación con ID:', teamId);

    // Confirmar la transacción
    await pool.query('COMMIT');

    res.status(201).json({ message: 'Equipo creado, jugadores añadidos y clasificaciones actualizadas con éxito.', team_id: teamId });
  } catch (error) {
    // Revertir en caso de error
    await pool.query('ROLLBACK');
    console.error('Error al crear el equipo:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Obtener equipos y jugadores de una liga
exports.getTeamsByLeague = async (req, res) => {
  console.log("Obteniendo equipos de la liga");
  const { league_id } = req.params;

  try {
    const teamsQuery = `
      SELECT t.*, 
             ARRAY_AGG(JSON_BUILD_OBJECT('name', p.name, 'dni', p.dni, 'dorsal', p.dorsal, 'phone', p.phone)) AS players
      FROM teams t
      LEFT JOIN players p ON t.team_id = p.team_id
      WHERE t.league_id = $1
      GROUP BY t.team_id;
    `;
    const { rows } = await pool.query(teamsQuery, [league_id]);

    res.json({ teams: rows });
    console.log("Equipos de la liga:", rows);
  } catch (error) {
    console.error('Error al obtener equipos:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.generateLeagueLink = async (req, res) => {
  const { league_id } = req.params;
  const { date } = req.body; // La fecha de los partidos en formato YYYY-MM-DD

  if (!league_id) {
    return res.status(400).json({ message: 'Se requiere el ID de la liga.' });
  }

  if (!date) {
    return res.status(400).json({ message: 'Se requiere la fecha de los partidos.' });
  }

  try {
    // Convertir la fecha proporcionada en un objeto Date y establecerla al inicio del día
    const matchDate = new Date(date);
    const matchDateStart = new Date(matchDate.setHours(0, 0, 0, 0));

    // Verificar si ya existe un link para esta liga y esta fecha
    const existingLink = await pool.query(
      `SELECT * FROM league_links WHERE league_id = $1 AND date = $2`,
      [league_id, matchDateStart]
    );

    if (existingLink.rows.length > 0) {
      return res.status(200).json({
        message: 'El link para esta liga y fecha ya existe.',
        link: existingLink.rows[0],
      });
    }

    // Generar un nuevo UUID y construir el link dinámico
    const uuid = uuidv4(); // Generar el UUID
    const baseUrl = process.env.APP_URL || 'http://localhost:3000'; // Base URL configurable
    const link = `${baseUrl}/${league_id}/matches/${date}/${uuid}`;

    // Establecer la fecha de expiración (2 días después del partido)
    const expiresAt = new Date(matchDateStart);
    expiresAt.setDate(expiresAt.getDate() + 2);

    // Guardar el link en la base de datos
    const result = await pool.query(
      `INSERT INTO league_links (league_id, link, date, expires_at) VALUES ($1, $2, $3, $4) RETURNING *`,
      [league_id, link, matchDateStart, expiresAt]
    );

    res.status(201).json({
      message: 'Link generado con éxito',
      link: result.rows[0],
    });
  } catch (error) {
    console.error('Error al generar el link:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};



// Obtener links asociados a una liga
exports.getLeagueLinks = async (req, res) => {
  const { league_id } = req.params;

  try {
    // Verificar que el league_id es válido
    if (!league_id) {
      return res.status(400).json({ message: 'El ID de la liga es requerido.' });
    }

    // Consulta para obtener los links asociados a la liga
    const query = `
    SELECT 
      link_id, 
      league_id, 
      link, 
      TO_CHAR(date, 'YYYY-MM-DD') AS date, 
      expires_at 
    FROM league_links 
    WHERE league_id = $1
    ORDER BY expires_at DESC;
    `;

    const { rows } = await pool.query(query, [league_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron links para esta liga.' });
    }

    res.status(200).json({ message: 'Links obtenidos con éxito.', links: rows });
  } catch (error) {
    console.error('Error al obtener los links:', error.message);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

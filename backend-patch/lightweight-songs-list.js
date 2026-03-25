/**
 * Backend optimization: Lightweight song list + pagination.
 *
 * PROBLEM: GET /songs returns full lyrics (main_stanza + all stanzas JSON) for
 * every song, resulting in ~8MB responses. The frontend only needs metadata for
 * the song table, search dropdowns, and filters.
 *
 * SOLUTION: New GET /songs/list endpoint that returns only metadata columns,
 * with optional server-side pagination and search.
 *
 * ─── Add to server.js (BEFORE the existing GET /songs route) ────────────────
 */

/*

// Lightweight song list with pagination + search
// GET /songs/list
// GET /songs/list?page=1&limit=20&search=keyword
//
// Returns:
// {
//   songs: [{ song_id, song_name, stanza_count, created_at, last_updated_at, created_by, last_updated_by }],
//   total: 245,
//   page: 1,
//   limit: 20,
//   totalPages: 13
// }

app.get("/songs/list", (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const search = (req.query.search || "").trim();
  const offset = (page - 1) * limit;

  const whereClause = search ? "WHERE s.song_name LIKE ?" : "";
  const searchParam = search ? [`%${search}%`] : [];

  // Count total matching songs
  const countQuery = `SELECT COUNT(*) as total FROM songs s ${whereClause}`;

  db.get(countQuery, searchParam, (err, countRow) => {
    if (err) {
      console.error("Error counting songs:", err);
      return res.status(500).json({ error: "Failed to count songs" });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    // Fetch metadata only — no lyrics/stanza JSON blobs
    // stanza_count is derived from the stanzas table (count of stanza rows per song)
    const dataQuery = `
      SELECT
        s.song_id,
        s.song_name,
        s.created_at,
        s.last_updated_at,
        s.created_by,
        s.last_updated_by,
        COUNT(st.id) as stanza_count
      FROM songs s
      LEFT JOIN stanzas st ON st.song_id = s.song_id
      ${whereClause}
      GROUP BY s.song_id
      ORDER BY s.last_updated_at DESC, s.song_id DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataQuery, [...searchParam, limit, offset], (err, rows) => {
      if (err) {
        console.error("Error fetching song list:", err);
        return res.status(500).json({ error: "Failed to fetch songs" });
      }

      res.json({
        songs: rows,
        total,
        page,
        limit,
        totalPages,
      });
    });
  });
});

*/

/**
 * ─── ALTERNATIVE: If your DB schema doesn't have a separate stanzas table ───
 *
 * If stanzas are stored as JSON inside the songs table (e.g. a `stanzas` TEXT
 * column with JSON array), use this simpler version instead:
 */

/*

app.get("/songs/list", (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const search = (req.query.search || "").trim();
  const offset = (page - 1) * limit;

  const whereClause = search ? "WHERE song_name LIKE ?" : "";
  const searchParam = search ? [`%${search}%`] : [];

  db.get(`SELECT COUNT(*) as total FROM songs ${whereClause}`, searchParam, (err, countRow) => {
    if (err) return res.status(500).json({ error: "Failed to count songs" });

    const total = countRow.total;

    db.all(
      `SELECT song_id, song_name, created_at, last_updated_at, created_by, last_updated_by
       FROM songs ${whereClause}
       ORDER BY last_updated_at DESC, song_id DESC
       LIMIT ? OFFSET ?`,
      [...searchParam, limit, offset],
      (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch songs" });
        res.json({
          songs: rows,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      }
    );
  });
});

*/

/**
 * ─── Frontend changes after applying this ───────────────────────────────────
 *
 * 1. In src/api/client.js, add:
 *
 *    export const fetchSongList = (page = 1, limit = 20, search = "") =>
 *      axios.get(`${API_BASE}/songs/list`, { params: { page, limit, search } });
 *
 * 2. Components that show song lists (Songs.jsx, SongPreview.jsx, EditSong.jsx,
 *    DeleteSong.jsx) should use fetchSongList() instead of fetchSongs().
 *
 * 3. SongTable already has client-side pagination — it can switch to server-side
 *    pagination using the { total, page, limit, totalPages } response fields.
 *
 * 4. Full lyrics are still fetched on demand via GET /songs/:id when a user
 *    clicks Preview, Edit, or selects a song in the Slide Composer.
 *
 * ─── Response size comparison ───────────────────────────────────────────────
 *
 *   GET /songs       → ~8MB   (full lyrics for all songs)
 *   GET /songs/list  → ~15KB  (20 rows of metadata per page)
 *
 * That's a ~500x reduction per request.
 */

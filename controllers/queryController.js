import pool from '../config/db.js';
import { Parser } from 'json2csv';

const history = [];
let lastResult = null;

// Proteksi: hanya izinkan SELECT
const isQuerySafe = (query) => {
  return query?.trim().toLowerCase().startsWith('select');
};

export const renderHome = async (req, res) => {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    res.render('index', {
      tables,
      output: null,
      sql: '',
      history,
      pagination: null
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

export const executeQuery = async (req, res) => {
  const sql = req.body?.sql;

  // Cegah error destrukturisasi & permintaan kosong
  if (!sql || typeof sql !== 'string') {
    return res.status(400).send('❌ SQL query tidak ditemukan di request body.');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  try {
    // Ambil semua nama tabel
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    // Cek keamanan query
    if (!isQuerySafe(sql)) {
      return res.render('index', {
        tables,
        output: '❌ Query diblokir: Hanya perintah SELECT yang diizinkan.',
        sql,
        history,
        pagination: null
      });
    }

    // Hapus semicolon di akhir
    const baseSql = sql.trim().replace(/;$/, '');
    let paginatedSql = baseSql;

    // Tambahkan pagination jika belum ada
    const lowerSql = baseSql.toLowerCase();
    const hasLimit = /limit\s+\d+/.test(lowerSql);
    const hasOffset = /offset\s+\d+/.test(lowerSql);

    if (!hasLimit && !hasOffset) {
      paginatedSql += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    // Jalankan query utama
    const result = await pool.query(paginatedSql);

    // Hitung total baris (untuk pagination)
    const countQuery = `SELECT COUNT(*) AS total FROM (${baseSql}) AS subquery`;
    const countRes = await pool.query(countQuery);
    const totalRows = parseInt(countRes.rows[0].total, 10);
    const totalPages = Math.ceil(totalRows / limit);

    // Simpan history query
    history.unshift(sql);
    if (history.length > 10) history.pop();
    lastResult = result.rows;

    // Render output
    res.render('index', {
      tables,
      output: JSON.stringify(result.rows, null, 2),
      sql,
      history,
      pagination: {
        totalPages,
        page
      }
    });
  } catch (err) {
    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    res.render('index', {
      tables,
      output: `❌ Error saat menjalankan query:\n${err.message}`,
      sql,
      history,
      pagination: null
    });
  }
};

export const downloadCSV = async (req, res) => {
  const sql = req.body?.sql;
  const delimiter = req.query.delimiter === 'comma' ? ',' : ';';

  if (!sql || !isQuerySafe(sql)) {
    return res.status(400).send('❌ Query diblokir saat ekspor CSV: Hanya perintah SELECT yang diizinkan.');
  }

  try {
    const result = await pool.query(sql);
    const fields = result.fields.map(f => f.name);
    const opts = { fields, delimiter };

    const parser = new Parser(opts);
    const csv = parser.parse(result.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('query-result.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send(`Error generating CSV: ${err.message}`);
  }
};

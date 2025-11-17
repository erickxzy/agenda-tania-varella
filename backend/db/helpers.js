const pool = require('./config');

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

async function getOne(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

async function getAll(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

async function insert(text, params) {
  const res = await pool.query(text + ' RETURNING *', params);
  return res.rows[0];
}

async function update(text, params) {
  const res = await pool.query(text + ' RETURNING *', params);
  return res.rows[0];
}

async function deleteOne(text, params) {
  const res = await pool.query(text, params);
  return res.rowCount;
}

module.exports = {
  query,
  getOne,
  getAll,
  insert,
  update,
  deleteOne,
  pool
};

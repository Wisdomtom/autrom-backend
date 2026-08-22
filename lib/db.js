const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. from Railway/Render/Supabase
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

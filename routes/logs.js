const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// Powers the dashboard's execution log table
router.get('/:userId', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const result = await db.query(
    `SELECT stage, status, message, created_at FROM execution_logs
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [req.params.userId, limit]
  );
  res.json(result.rows);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// Get current settings (master toggle state + interval)
router.get('/:userId', async (req, res) => {
  const result = await db.query(
    `SELECT is_active, interval_hours, niche, next_run_at FROM pipeline_settings WHERE user_id = $1`,
    [req.params.userId]
  );
  res.json(result.rows[0] || { is_active: false, interval_hours: 6 });
});

// Flip the master toggle on/off
router.post('/:userId/toggle', async (req, res) => {
  const { isActive } = req.body;
  await db.query(
    `INSERT INTO pipeline_settings (user_id, is_active, next_run_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET is_active = $2, updated_at = now()`,
    [req.params.userId, isActive]
  );
  res.json({ ok: true });
});

// Update posting interval — must be one of the six allowed values
const ALLOWED_INTERVALS = [2, 4, 6, 8, 10, 12];
router.post('/:userId/interval', async (req, res) => {
  const { hours } = req.body;
  if (!ALLOWED_INTERVALS.includes(hours)) {
    return res.status(400).json({ error: `hours must be one of ${ALLOWED_INTERVALS.join(', ')}` });
  }
  await db.query(
    `UPDATE pipeline_settings SET interval_hours = $1, updated_at = now() WHERE user_id = $2`,
    [hours, req.params.userId]
  );
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// List linked accounts for a user
router.get('/:userId', async (req, res) => {
  const result = await db.query(
    `SELECT platform, status, created_at FROM social_accounts WHERE user_id = $1`,
    [req.params.userId]
  );
  res.json(result.rows);
});

// Kick off the Ayrshare hosted "Link Accounts" flow — returns a URL
// the frontend redirects the user to. Ayrshare handles the OAuth dance
// for all six platforms behind that single link.
router.post('/:userId/link', async (req, res) => {
  const response = await fetch('https://api.ayrshare.com/api/profiles/generateJWT', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domain: process.env.AYRSHARE_DOMAIN }),
  });
  const data = await response.json();
  res.json({ linkUrl: data.url }); // frontend redirects user here
});

module.exports = router;

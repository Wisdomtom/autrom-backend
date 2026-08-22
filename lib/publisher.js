// Broadcasts one finished video to every platform the user has linked,
// via Ayrshare's unified social API (handles YouTube/TikTok/IG/FB/LinkedIn/X
// through a single call instead of six separate platform SDKs + OAuth flows).

const db = require('./db');

async function publishToAllPlatforms(userId, { videoUrl, caption }) {
  const linked = await db.query(
    `SELECT platform FROM social_accounts WHERE user_id = $1 AND status = 'linked'`,
    [userId]
  );
  const platforms = linked.rows.map(r => r.platform);
  if (platforms.length === 0) return [];

  const res = await fetch('https://api.ayrshare.com/api/post', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
      // Ayrshare's Business plan uses a per-user "Profile Key" to route
      // the post through that specific user's linked accounts.
      'Profile-Key': await getProfileKeyForUser(userId),
    },
    body: JSON.stringify({
      post: caption,
      mediaUrls: [videoUrl],
      platforms, // e.g. ['youtube','tiktok','instagram','facebook','linkedin','twitter']
    }),
  });

  const data = await res.json();

  // Ayrshare returns a per-platform result array — map it into our shape.
  return platforms.map(platform => {
    const result = (data.postIds || []).find(p => p.platform === platform);
    if (result && result.status === 'success') {
      return { platform, status: 'posted', platformPostId: result.id };
    }
    return { platform, status: 'failed', error: result?.errors?.[0]?.message || 'Unknown error' };
  });
}

async function getProfileKeyForUser(userId) {
  // TODO: store each user's Ayrshare Profile Key (created when they link
  // accounts through Ayrshare's hosted "Link Accounts" flow) and fetch it here.
  const row = await db.query(`SELECT ayrshare_profile_key FROM users WHERE id = $1`, [userId]);
  return row.rows[0]?.ayrshare_profile_key;
}

module.exports = { publishToAllPlatforms };

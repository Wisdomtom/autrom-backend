// The orchestrator ties every stage together for one pipeline run:
// ideate -> script -> voice -> video clips -> compose -> publish -> log
//
// Each stage is a thin wrapper around a real provider call (left as TODOs
// below). Swap in real API keys and this file doesn't need to change shape.

const db = require('./db');
const { generateScript } = require('./ai-scriptwriter');
const { generateVoiceover } = require('./tts');
const { generateVideoClips } = require('./video-gen');
const { composeVideo } = require('./video-compose');
const { publishToAllPlatforms } = require('./publisher');

async function log(userId, stage, status, message, refId = null) {
  await db.query(
    `INSERT INTO execution_logs (user_id, stage, status, message, ref_id) VALUES ($1,$2,$3,$4,$5)`,
    [userId, stage, status, message, refId]
  );
}

// Called on a cron tick. Finds every user whose next_run_at has passed
// and the master toggle is on, then runs their pipeline and reschedules them.
async function runPipelineForActiveUsers() {
  const due = await db.query(
    `SELECT user_id, interval_hours, niche FROM pipeline_settings
     WHERE is_active = true AND (next_run_at IS NULL OR next_run_at <= now())`
  );

  for (const row of due.rows) {
    runPipelineForUser(row.user_id, row.niche).catch(err =>
      log(row.user_id, 'publish', 'error', `Pipeline crashed: ${err.message}`)
    );

    await db.query(
      `UPDATE pipeline_settings SET next_run_at = now() + ($1 || ' hours')::interval WHERE user_id = $2`,
      [row.interval_hours, row.user_id]
    );
  }
}

async function runPipelineForUser(userId, niche) {
  // 1. Ideation + scripting
  const script = await generateScript(niche);
  const scriptRow = await db.query(
    `INSERT INTO scripts (user_id, niche, hook, full_script, scene_prompts, captions)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [userId, niche, script.hook, script.fullScript, JSON.stringify(script.scenes), JSON.stringify(script.captions)]
  );
  const scriptId = scriptRow.rows[0].id;
  await log(userId, 'scripting', 'ok', 'Script generated', scriptId);

  // 2. Voiceover
  const voiceoverUrl = await generateVoiceover(script.fullScript);
  await log(userId, 'tts', 'ok', 'Voiceover rendered', scriptId);

  // 3. Raw video clips per scene
  const clipUrls = await generateVideoClips(script.scenes);
  await log(userId, 'video_gen', 'ok', `${clipUrls.length} clips generated`, scriptId);

  // 4. Composition: stitch clips + voiceover + auto-subtitles into 9:16 MP4
  const videoRow = await db.query(
    `INSERT INTO videos (script_id, user_id, voiceover_url, raw_clip_urls, status)
     VALUES ($1,$2,$3,$4,'rendering') RETURNING id`,
    [scriptId, userId, voiceoverUrl, JSON.stringify(clipUrls)]
  );
  const videoId = videoRow.rows[0].id;

  const finalVideoUrl = await composeVideo({ clipUrls, voiceoverUrl, captions: script.captions });
  await db.query(`UPDATE videos SET final_video_url = $1, status = 'ready' WHERE id = $2`, [finalVideoUrl, videoId]);
  await log(userId, 'compose', 'ok', 'Final video composed', videoId);

  // 5. Publish to every linked platform simultaneously
  const results = await publishToAllPlatforms(userId, {
    videoUrl: finalVideoUrl,
    caption: script.captions.en || script.hook,
  });

  for (const r of results) {
    await db.query(
      `INSERT INTO posts (video_id, user_id, platform, platform_post_id, caption, status, error_message, posted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $6='posted' THEN now() ELSE NULL END)`,
      [videoId, userId, r.platform, r.platformPostId || null, script.hook, r.status, r.error || null]
    );
    await log(userId, 'publish', r.status === 'posted' ? 'ok' : 'error', `${r.platform}: ${r.status}`, videoId);
  }
}

module.exports = { runPipelineForActiveUsers, runPipelineForUser };

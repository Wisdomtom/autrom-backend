// Turns each scene's visual_prompt into a raw video clip via a text-to-video
// model. Swap in Runway, Luma, Pika, or Kling depending on your account access.

async function generateVideoClips(scenes) {
  const urls = [];
  for (const scene of scenes) {
    const res = await fetch('https://api.runwayml.com/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: scene.visual_prompt,
        duration: scene.duration_sec,
        aspect_ratio: '9:16',
      }),
    });

    if (!res.ok) throw new Error(`Video gen failed for scene ${scene.scene}: ${res.status}`);
    const data = await res.json();
    // Most video-gen APIs are async (submit job -> poll for completion).
    // TODO: implement polling against data.job_id until status === 'completed',
    // then push the resulting clip URL below.
    urls.push(data.output_url);
  }
  return urls;
}

module.exports = { generateVideoClips };

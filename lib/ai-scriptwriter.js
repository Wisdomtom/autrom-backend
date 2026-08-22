// Generates a video concept: hook, full script, scene-by-scene visual
// prompts, and localized captions — using the Anthropic API.
// Uses the "return structured JSON only" pattern so the output can be
// parsed directly into scripts.scene_prompts / captions.

const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateScript(niche) {
  const prompt = `You are a viral short-form video scriptwriter for the "${niche}" niche.
Return ONLY valid JSON, no markdown, no preamble, matching exactly this shape:
{
  "hook": "first 2 seconds, must stop the scroll",
  "fullScript": "full voiceover script, 30-45 seconds spoken",
  "scenes": [
    { "scene": 1, "visual_prompt": "description for a video generation model", "duration_sec": 5 }
  ],
  "captions": { "en": "on-screen caption text" }
}`;

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res.content.map(b => b.text || '').join('').trim();
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

module.exports = { generateScript };

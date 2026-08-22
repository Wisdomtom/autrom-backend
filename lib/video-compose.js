// Stitches raw clips + voiceover into one 9:16 MP4 with auto-generated
// subtitle overlay, via Creatomate's template/render API.

async function composeVideo({ clipUrls, voiceoverUrl, captions }) {
  const res = await fetch('https://api.creatomate.com/v1/renders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CREATOMATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: process.env.CREATOMATE_TEMPLATE_ID, // pre-built 9:16 template with subtitle track
      modifications: {
        'Clips': clipUrls,
        'Voiceover': voiceoverUrl,
        'Subtitles.text': captions.en,
      },
    }),
  });

  if (!res.ok) throw new Error(`Composition failed: ${res.status}`);
  const data = await res.json();

  // Creatomate renders are async. TODO: poll GET /v1/renders/{id} until
  // status === 'succeeded', then return the .url field.
  return data.url;
}

module.exports = { composeVideo };

// Text-to-speech. Swap in ElevenLabs, PlayHT, or OpenAI TTS.
// Returns a hosted URL to the rendered voiceover audio file.

async function generateVoiceover(script) {
  const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/YOUR_VOICE_ID', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_multilingual_v2',
    }),
  });

  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);

  // TODO: stream the audio buffer to your own storage (S3/R2/Supabase Storage)
  // and return the public URL. Returning a placeholder here.
  const audioBuffer = await res.arrayBuffer();
  const uploadedUrl = await uploadToStorage(audioBuffer, 'audio/mpeg', 'voiceover.mp3');
  return uploadedUrl;
}

async function uploadToStorage(buffer, contentType, filename) {
  // TODO: implement upload to your object storage of choice.
  throw new Error('uploadToStorage not implemented — connect S3/R2/Supabase Storage');
}

module.exports = { generateVoiceover };

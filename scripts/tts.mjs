// Minimal server-side ElevenLabs text-to-speech wiring.
//
// Usage:
//   node scripts/tts.mjs "Some text to speak" [output.mp3]
//
// Requires ELEVENLABS_API_KEY in the environment (see .env.example).
// This runs on the server/CLI only — never ship the API key to the browser.
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "cjVigY5qzO86Huf0OWal";
const MODEL_ID = "eleven_flash_v2_5";

async function main() {
  if (!API_KEY) {
    console.error(
      "Missing ELEVENLABS_API_KEY. Copy .env.example to .env and add your key.",
    );
    process.exit(1);
  }

  const text = process.argv[2] || "Session complete. Nice detox.";
  const outFile = process.argv[3] || "speech.mp3";

  const client = new ElevenLabsClient({ apiKey: API_KEY });

  console.log(`Synthesizing (${text.length} chars) with voice ${VOICE_ID}…`);
  const audio = await client.textToSpeech.convert(VOICE_ID, {
    text,
    modelId: MODEL_ID,
    outputFormat: "mp3_44100_128",
  });

  const buffer = await toBuffer(audio);
  await writeFile(outFile, buffer);
  console.log(`Wrote ${buffer.length} bytes to ${outFile}`);
}

// The SDK may return a web ReadableStream, an async iterable, or a Buffer.
async function toBuffer(audio) {
  if (Buffer.isBuffer(audio)) return audio;
  if (audio instanceof Uint8Array) return Buffer.from(audio);

  const chunks = [];
  const reader = audio?.getReader?.();
  if (reader) {
    // Web ReadableStream
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  } else {
    // Async iterable (e.g. Node stream)
    for await (const chunk of audio) chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

main().catch((err) => {
  console.error("TTS failed:", err?.message || err);
  process.exit(1);
});

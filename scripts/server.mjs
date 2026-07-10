// Minimal Node server that serves the voice demo and proxies TTS to
// ElevenLabs. The API key lives ONLY here (server-side), never in the browser.
//
//   node scripts/server.mjs   →   http://localhost:3000
//
// Requires ELEVENLABS_API_KEY in the environment (see .env.example).
import "dotenv/config";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "cjVigY5qzO86Huf0OWal";
const MODEL_ID = "eleven_flash_v2_5";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_HTML = join(__dirname, "..", "examples", "voice-demo.html");

const client = API_KEY ? new ElevenLabsClient({ apiKey: API_KEY }) : null;

async function toBuffer(audio) {
  if (Buffer.isBuffer(audio)) return audio;
  if (audio instanceof Uint8Array) return Buffer.from(audio);
  const chunks = [];
  const reader = audio?.getReader?.();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  } else {
    for await (const chunk of audio) chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10_000) req.destroy(); // basic guard
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      const html = await readFile(DEMO_HTML);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (req.method === "POST" && req.url === "/api/tts") {
      if (!client) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Server missing ELEVENLABS_API_KEY" }));
      }
      const { text } = JSON.parse((await readBody(req)) || "{}");
      if (!text || typeof text !== "string") {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Provide non-empty 'text'" }));
      }
      const audio = await client.textToSpeech.convert(VOICE_ID, {
        text: text.slice(0, 500), // cap request size
        modelId: MODEL_ID,
        outputFormat: "mp3_44100_128",
      });
      const buffer = await toBuffer(audio);
      res.writeHead(200, { "Content-Type": "audio/mpeg" });
      return res.end(buffer);
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err?.message || "Server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`Voice demo on http://localhost:${PORT}`);
  if (!API_KEY) console.warn("⚠  ELEVENLABS_API_KEY not set — /api/tts will 500.");
});

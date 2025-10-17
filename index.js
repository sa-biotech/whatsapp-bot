// --- LOAD ENV FIRST ---
import "dotenv/config";
import express from "express";
import qrcode from "qrcode";
import pkg from "whatsapp-web.js";

const { Client } = pkg;

// --- ENV CONFIG ---
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const PORT = process.env.PORT || 3000;

// Optional chromium flags (for Render / low RAM)
const CHROMIUM_FLAGS = process.env.CHROMIUM_FLAGS
  ? process.env.CHROMIUM_FLAGS.split(" ")
  : [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-accelerated-2d-canvas",
      "--disable-background-networking",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-translate",
      "--disable-sync",
      "--disable-software-rasterizer",
    ];

// --- Express app ---
const app = express();

// Store latest QR image
let qrData = "";

// --- WhatsApp client (stateless, no session persistence) ---
const client = new Client({
  puppeteer: {
    headless: true,
    args: CHROMIUM_FLAGS,
  },
});

// --- WhatsApp Events ---
client.on("qr", async (qr) => {
  console.log("📲 QR RECEIVED - open /qr to scan");

  try {
    qrData = await qrcode.toDataURL(qr);
    console.log("✅ QR code generated. Visit /qr to scan.");
  } catch (err) {
    console.error("❌ Failed to generate QR image:", err.message);
  }
});

client.on("ready", () => {
  console.log(`✅ WhatsApp ready: ${client.info?.me?.user || "?"}`);
  qrData = ""; // clear QR once connected
});

client.on("authenticated", () => console.log("🔐 Authenticated!"));
client.on("auth_failure", (msg) => console.error("⚠️ Auth failure:", msg));
client.on("disconnected", (reason) => console.warn("⚠️ Disconnected:", reason));

// --- Cooldown logic ---
const botStartTime = Date.now();
const COOLDOWN_MS = 2 * 60 * 1000;

// --- Message handler ---
client.on("message", async (msg) => {
  if (msg.timestamp * 1000 < botStartTime) return;
  if (Date.now() - botStartTime < COOLDOWN_MS) return;
  if (msg.from === "status@broadcast") return;
  if (msg.type !== "chat" || !msg.body?.trim()) return;

  console.log(`📩 ${msg.from}: ${msg.body.substring(0, 30)}...`);

  if (!N8N_WEBHOOK_URL) return;

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: msg.from, message: msg.body }),
    });

    let replyData;
    try {
      replyData = await res.json();
    } catch {
      replyData = {};
    }

    if (Array.isArray(replyData)) replyData = replyData[0];
    const replyText = replyData?.Reply || replyData?.reply;

    if (replyText) {
      await client.sendMessage(msg.from, replyText);
      console.log("💬 Sent reply:", String(replyText).substring(0, 30));
    }
  } catch (err) {
    console.error("❌ n8n webhook error:", err.message);
  }
});

// --- Initialize WhatsApp ---
client.initialize();

// --- Express routes ---
app.get("/", (req, res) => res.send("✅ WhatsApp bot is running (no session mode)"));

app.get("/qr", (req, res) => {
  if (!qrData) {
    return res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
          <h2>QR not generated yet</h2>
          <p>Wait a few seconds or check Render logs to confirm initialization.</p>
        </body>
      </html>
    `);
  }
  res.send(`
    <html>
      <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
        <h2>📱 Scan this QR with WhatsApp</h2>
        <img src="${qrData}" style="width:300px;height:300px"/>
        <p>After scanning, this page will automatically expire when connected.</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`🌐 HTTP server running on port ${PORT}`));

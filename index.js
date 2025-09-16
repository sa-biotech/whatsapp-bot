// --- ENV ---
import "dotenv/config";
import express from "express";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode";

const { Client } = pkg;

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const PORT = process.env.PORT || 3000;

// --- WhatsApp client ---
const client = new Client({
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

let lastQR = "";

// --- Events ---
client.on("qr", async (qr) => {
  lastQR = await qrcode.toDataURL(qr);
  console.log("📲 QR RECEIVED - open /qr in browser to scan");
});

client.on("ready", () => {
  console.log(`✅ WhatsApp ready: ${client.info?.me?.user || "?"}`);
});

client.on("authenticated", () => console.log("🔐 Authenticated!"));
client.on("auth_failure", (msg) => console.error("⚠️ Auth failure:", msg));
client.on("disconnected", (reason) => console.warn("⚠️ Disconnected:", reason));

// --- Handle incoming messages ---
client.on("message", async (msg) => {
  if (msg.from === "status@broadcast") return; // skip status
  if (msg.type !== "chat" || !msg.body?.trim()) return; // only text

  console.log(`📩 ${msg.from}: ${msg.body}`);

  if (!N8N_WEBHOOK_URL) return;

  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: msg.from, message: msg.body }),
    });

    const text = await res.text();
    let replyText = null;
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) replyText = data[0]?.Reply || data[0]?.reply;
      else replyText = data?.Reply || data?.reply;
    } catch {
      // ignore invalid JSON
    }

    if (replyText) {
      await client.sendMessage(msg.from, replyText);
      console.log("💬 Sent reply:", replyText);
    }
  } catch (err) {
    console.error("❌ n8n webhook error:", err.message);
  }
});

// --- Start ---
client.initialize();

// --- Express server ---
const app = express();

app.get("/", (req, res) => res.send("✅ WhatsApp simple bot is running"));

// QR endpoint
app.get("/qr", (req, res) => {
  if (!lastQR) return res.send("No QR yet, wait...");
  res.send(`<h2>Scan this QR with WhatsApp</h2><img src="${lastQR}" />`);
});

app.listen(PORT, () => console.log(`🌐 HTTP server running on port ${PORT}`));

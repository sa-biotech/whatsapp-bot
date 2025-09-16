// --- LOAD ENV FIRST ---
import "dotenv/config"; // ✅ Must be first line
import express from "express";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import pkgSupabase from "@supabase/supabase-js";
import { SupabaseStore } from "./supabaseStore.js"; // ✅ minimal version

const { Client, RemoteAuth } = pkg;
const { createClient } = pkgSupabase;

// --- ENV CONFIG ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const PORT = process.env.PORT || 3000;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || "whatsapp-sessions";
const CLIENT_ID = process.env.WHATSAPP_CLIENT_ID || "render-bot-960";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Supabase URL/KEY missing");
  process.exit(1);
}

// --- Supabase client + Store ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const store = new SupabaseStore(supabase, BUCKET_NAME);

// --- WhatsApp client ---
const client = new Client({
  authStrategy: new RemoteAuth({
    clientId: CLIENT_ID,
    store,
    backupSyncIntervalMs: 24 * 60 * 60 * 1000, // ✅ once per day
    syncFullHistory: false, // ✅ don't pull chat history
  }),
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
      "--disable-background-networking",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-translate",
      "--disable-sync",
    ],
  },
});

// --- Events ---
client.on("qr", (qr) => {
  console.log("📲 QR RECEIVED - scan to login:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log(`✅ WhatsApp ready: ${client.info?.me?.user || "?"}`);
});

client.on("authenticated", () => console.log("🔐 Authenticated!"));
client.on("auth_failure", (msg) => console.error("⚠️ Auth failure:", msg));
client.on("disconnected", (reason) =>
  console.warn("⚠️ Disconnected:", reason)
);

// --- Set a timestamp for when the bot started
const botStartTime = Date.now();

// --- Handle incoming messages ---
client.on("message", async (msg) => {
  // ➡️ Filter old messages received before the bot started
  // The 'timestamp' property is the time the message was sent (in seconds)
  // We multiply by 1000 to convert it to milliseconds for comparison with Date.now()
  if (msg.timestamp * 1000 < botStartTime) {
    console.log(`➡️ Ignoring old message from ${msg.from}: ${msg.body.substring(0, 20)}...`);
    return; // Stop processing this message
  }

  if (msg.from === "status@broadcast") return; // ignore status

  console.log(`📩 ${msg.from}: ${msg.body}`);

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
      console.log("💬 Sent reply:", replyText);
    }
  } catch (err) {
    console.error("❌ n8n webhook error:", err.message);
  }
});

// --- Start bot ---
client.initialize();

// --- Tiny web server (Render health checks) ---
const app = express();
app.get("/", (req, res) => res.send("✅ WhatsApp bot is running"));
app.listen(PORT, () => console.log(`🌐 HTTP server running on port ${PORT}`));
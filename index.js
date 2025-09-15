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
<<<<<<< HEAD
    backupSyncIntervalMs: 24 * 60 * 60 * 1000, // ✅ once per day
    syncFullHistory: false, // ✅ don't pull chat history
=======
    backupSyncIntervalMs: 86400000,
    syncFullHistory: false,
>>>>>>> e7bbd55d576df4f9ee6fb0bfd53031bf017b04d4
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

// --- Handle incoming messages ---
client.on("message", async (msg) => {
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

// index.js

// --- LOAD ENV FIRST ---
import "dotenv/config"; // ✅ Must be first line
import express from "express";
import qrcode from "qrcode-terminal";
import pkg from "whatsapp-web.js";
import pkgSupabase from "@supabase/supabase-js";
import { SupabaseStore } from "./supabaseStore.js"; // ✅ custom store

const { Client, RemoteAuth } = pkg;
const { createClient } = pkgSupabase;

// --- ENV CONFIG ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const PORT = process.env.PORT || 3000;

// --- Checks ---
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Supabase URL/KEY missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in env."
  );
  process.exit(1);
}

if (!N8N_WEBHOOK_URL) {
  console.warn("⚠️ N8N_WEBHOOK_URL not set. Messages won’t be forwarded.");
}

// --- Supabase client + Store ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const store = new SupabaseStore(supabase, "whatsapp_sessions");

// --- WhatsApp client ---
const client = new Client({
  authStrategy: new RemoteAuth({
    clientId: "render-bot-new",
    store,
    backupSyncIntervalMs: 60000,
    syncFullHistory: true,
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

// --- Extra RemoteAuth Debug Logs ---
client.on("authenticated", () => {
  console.log("🔐 [RemoteAuth] Authenticated!");
});

client.on("ready", () => {
  if (client.info && client.info.me) {
    console.log(
      `✅ [RemoteAuth] WhatsApp ready: ${client.info.me.user} (${client.info.me.phone})`
    );
  } else {
    console.log("✅ [RemoteAuth] WhatsApp ready (no client info)");
  }
});

client.on("remote_session_saved", (session) => {
  console.log("💾 [RemoteAuth] remote_session_saved triggered!");
  console.log("📦 Session data from event:", JSON.stringify(session, null, 2));
});

client.on("remote_session_restored", () => {
  console.log("♻️ [RemoteAuth] remote_session_restored triggered!");
});

client.on("auth_failure", (msg) => {
  console.error("⚠️ [RemoteAuth] Auth failure:", msg);
});

client.on("disconnected", (reason) => {
  console.warn("⚠️ [RemoteAuth] Disconnected:", reason);
});

// --- QR Code Event ---
client.on("qr", (qr) => {
  console.log("📲 QR RECEIVED - scan to login:");
  qrcode.generate(qr, { small: true });
});

// --- Handle incoming messages ---
client.on("message", async (msg) => {
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

// --- Tiny web server (for Render health checks) ---
const app = express();
app.get("/", (req, res) => res.send("✅ WhatsApp bot is running"));
app.listen(PORT, () =>
  console.log(`🌐 HTTP server running on port ${PORT}`)
);

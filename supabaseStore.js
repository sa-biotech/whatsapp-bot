import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";

export class SupabaseStore {
  constructor(supabase, bucket = "whatsapp-sessions") {
    this.supabase = supabase;
    this.bucket = bucket;
    this.tmpDir = path.join(os.tmpdir(), "wa-sessions");

    // ensure tmp dir exists
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
  }

  // Check if a session exists
  async sessionExists({ session }) {
    console.log("🔍 [SupabaseStore] Checking session:", session);
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list("", { search: `${session}.zip` });

    if (error) {
      console.error("❌ [SupabaseStore] sessionExists error:", error.message);
      return false;
    }

    return data && data.length > 0;
  }

  // Download + extract
  async extract({ session, path: extractPath }) {
    console.log("📥 [SupabaseStore] Extracting session:", session);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(`${session}.zip`);

    if (error || !data) {
      console.log("⚠️ [SupabaseStore] No session found");
      return null;
    }

    const buf = Buffer.from(await data.arrayBuffer());
    await fsp.writeFile(extractPath, buf);
    console.log("✅ [SupabaseStore] Session ZIP written locally:", extractPath);

    // --- Auto-clean old zips (keep only latest 2) ---
    await this.cleanTmp();

    return extractPath;
  }

  // Save zip
  async save({ session }) {
    console.log("📝 [SupabaseStore] Saving session:", session);

    const localZip = path.resolve(`${session}.zip`);

    try {
      const fileStream = fs.createReadStream(localZip);

      // Collect stream into buffer (Supabase API does not accept streams yet)
      const chunks = [];
      for await (const chunk of fileStream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(`${session}.zip`, buffer, {
          contentType: "application/zip",
          upsert: true,
        });

      if (error) throw error;
      console.log("✅ [SupabaseStore] Session saved:", `${session}.zip`);

      // Auto-clean old tmp
      await this.cleanTmp();
    } catch (err) {
      console.error("❌ [SupabaseStore] Save error:", err.message);
    }
  }

  // Delete session
  async delete({ session }) {
    console.log("🗑️ [SupabaseStore] Deleting:", session);

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([`${session}.zip`]);

    if (error) {
      console.error("❌ [SupabaseStore] Delete error:", error.message);
      throw error;
    }

    console.log("✅ [SupabaseStore] Deleted:", session);
  }

  // --- Auto-clean tmp files ---
  async cleanTmp() {
    try {
      const files = await fsp.readdir(this.tmpDir);
      if (files.length > 2) {
        // delete oldest
        const stats = await Promise.all(
          files.map(async f => {
            const st = await fsp.stat(path.join(this.tmpDir, f));
            return { file: f, time: st.mtimeMs };
          })
        );
        stats.sort((a, b) => a.time - b.time);
        const toDelete = stats.slice(0, files.length - 2);
        for (const f of toDelete) {
          await fsp.unlink(path.join(this.tmpDir, f.file));
          console.log("🧹 [SupabaseStore] Removed old tmp:", f.file);
        }
      }
    } catch (err) {
      console.warn("⚠️ [SupabaseStore] cleanTmp failed:", err.message);
    }
  }
}

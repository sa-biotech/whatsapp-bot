import fsp from "fs/promises";
import path from "path";

export class SupabaseStore {
  constructor(supabase, bucket = "whatsapp-sessions") {
    this.supabase = supabase;
    this.bucket = bucket;
  }

  // Only check if session exists
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

  // Only download session once on startup
  async extract({ session, path: extractPath }) {
    console.log("📥 [SupabaseStore] Extracting session:", session);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(`${session}.zip`);

    if (error || !data) {
      console.log("⚠️ [SupabaseStore] No session found in bucket");
      return null;
    }

    const buf = Buffer.from(await data.arrayBuffer());
    await fsp.writeFile(extractPath, buf);
    console.log("✅ [SupabaseStore] Session restored from Supabase");

    return extractPath;
  }

  // 🚫 Disable saving completely
  async save() {
    console.log("⏩ [SupabaseStore] Save skipped (read-only mode)");
  }

  async delete() {
    console.log("⏩ [SupabaseStore] Delete skipped (read-only mode)");
  }
}

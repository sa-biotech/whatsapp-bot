import fs from "fs/promises";
import path from "path";

export class SupabaseStore {
  constructor(supabase, bucket = "whatsapp-sessions") {
    this.supabase = supabase;
    this.bucket = bucket;
  }

  // Check if a session exists in Supabase bucket
  async sessionExists({ session }) {
    console.log("🔍 [SupabaseStore] Checking session in bucket:", session);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list("", { search: `${session}.zip` });

    if (error) {
      console.error("❌ [SupabaseStore] sessionExists error:", error.message);
      return false;
    }

    return data && data.length > 0;
  }

  // Download session zip from bucket → save locally at given path
  async extract({ session, path: extractPath }) {
    console.log("📥 [SupabaseStore] Extracting session:", session);

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(`${session}.zip`);

    if (error || !data) {
      console.log("⚠️ [SupabaseStore] No session found in bucket");
      return null;
    }

    // Save downloaded zip locally
    await fs.writeFile(extractPath, Buffer.from(await data.arrayBuffer()));
    console.log("✅ [SupabaseStore] Session ZIP written locally:", extractPath);

    return extractPath;
  }

  // Upload session zip from local disk to Supabase bucket
  async save({ session }) {
    console.log("📝 [SupabaseStore] Saving session:", session);

    const localZip = path.resolve(`${session}.zip`);

    try {
      const fileData = await fs.readFile(localZip);

      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(`${session}.zip`, fileData, {
          contentType: "application/zip",
          upsert: true,
        });

      if (error) {
        console.error("❌ [SupabaseStore] Save error:", error.message);
        throw error;
      }

      console.log("✅ [SupabaseStore] Session saved to bucket:", `${session}.zip`);
    } catch (err) {
      console.error("❌ [SupabaseStore] Failed reading local zip:", err.message);
    }
  }

  // Delete session zip from Supabase bucket
  async delete({ session }) {
    console.log("🗑️ [SupabaseStore] Deleting session:", session);

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .remove([`${session}.zip`]);

    if (error) {
      console.error("❌ [SupabaseStore] Delete error:", error.message);
      throw error;
    }

    console.log("✅ [SupabaseStore] Session deleted from bucket:", session);
  }
}

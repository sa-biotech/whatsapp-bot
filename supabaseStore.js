import fs from "fs/promises";

export class SupabaseStore {
  constructor(supabase, bucket = "whatsapp-sessions") {
    this.supabase = supabase;
    this.bucket = bucket;
  }

  async sessionExists({ session }) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list("", { search: `${session}.zip` });
    if (error) return false;
    return data && data.length > 0;
  }

  async extract({ session, path }) {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(`${session}.zip`);
    if (error || !data) return null;
    await fs.writeFile(path, Buffer.from(await data.arrayBuffer()));
    return path;
  }

  async save({ session }) {
    // ✅ Minimal: only save once (login). No repeated backups.
    try {
      const data = await fs.readFile(`${session}.zip`);
      await this.supabase.storage
        .from(this.bucket)
        .upload(`${session}.zip`, data, { upsert: true });
    } catch (err) {
      console.error("❌ Save error:", err.message);
    }
  }

  async delete({ session }) {
    await this.supabase.storage.from(this.bucket).remove([`${session}.zip`]);
  }
}

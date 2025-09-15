export class SupabaseStore {
  constructor(supabase, table = "whatsapp_sessions") {
    this.supabase = supabase;
    this.table = table;
  }

  // Check if a session exists
  async sessionExists({ session: id }) {
    console.log("🔍 Checking if session exists:", id);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("❌ sessionExists error:", error.message);
      return false;
    }
    return !!data;
  }

  // Load session from DB
  async extract({ session: id }) {
    console.log("📥 Extracting session:", id);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      console.log("⚠️ No session found in DB, returning null");
      return null;
    }
    return data.session;
  }

// Save or update session
async save({ session, data }) {
  console.log("📝 Saving session:", session);

  if (!data) {
    console.log("⚠️ Skip saving null session");
    return;
  }

  const { error } = await this.supabase
    .from(this.table)
    .upsert({ id: session, session: data }, { onConflict: "id" });

  if (error) {
    console.error("❌ Supabase save error:", error.message);
    throw new Error(error.message);
  }
  console.log("✅ Session saved in DB");
}

  // Delete session
  async delete({ session: id }) {
    console.log("🗑️ Deleting session:", id);
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Supabase delete error:", error.message);
      throw new Error(error.message);
    }
    console.log("✅ Session deleted from DB");
  }
}

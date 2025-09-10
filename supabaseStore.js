export class SupabaseStore {
  constructor(supabase, table = "whatsapp_sessions") {
    this.supabase = supabase;
    this.table = table;
  }

  // Check if a session exists
  async sessionExists({ session }) {
    console.log("🔍 Checking if session exists:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("id")
      .eq("id", session)
      .single();

    if (error) {
      if (error.code === "PGRST116") return false; // no rows
      console.error("❌ sessionExists error:", error.message);
      return false;
    }
    return !!data;
  }

  // Load session from DB
  async extract({ session }) {
    console.log("📥 Extracting session:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", session)
      .single();

    if (error || !data) {
      console.log("⚠️ No session found in DB, returning null");
      return null;
    }
    return data.session;
  }

  // Save or update session
  async save({ session, data }) {
    console.log("📝 Saving session:", session);
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
  async delete({ session }) {
    console.log("🗑️ Deleting session:", session);
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", session);

    if (error) {
      console.error("❌ Supabase delete error:", error.message);
      throw new Error(error.message);
    }
    console.log("✅ Session deleted from DB");
  }
}

export class SupabaseStore {
  constructor(supabase, table = "whatsapp_sessions") {
    this.supabase = supabase;
    this.table = table;
  }

  async sessionExists({ session }) {
    console.log("🔍 Checking if session exists:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("id")
      .eq("id", session)
      .maybeSingle();

    if (error) {
      console.error("❌ sessionExists error:", error.message);
      return false;
    }
    return !!data;
  }

  async extract({ session }) {
    console.log("📥 Extracting session:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", session)
      .maybeSingle();

    if (error) {
      console.error("❌ extract error:", error.message);
      return null;
    }

    if (!data || !data.session) {
      console.log("⚠️ No session found in DB, returning empty object");
      return {}; // 👈 instead of null
    }

    return data.session;
  }

  async save({ session, data }) {
    console.log("📝 Saving session:", session);
    const { error } = await this.supabase
      .from(this.table)
      .upsert({ id: session, session: data }, { onConflict: "id" });

    if (error) {
      console.error("❌ Supabase save error:", error.message);
      throw error;
    }
    console.log("✅ Session saved in DB");
  }

  async delete({ session }) {
    console.log("🗑️ Deleting session:", session);
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", session);

    if (error) {
      console.error("❌ Supabase delete error:", error.message);
      throw error;
    }
    console.log("✅ Session deleted from DB");
  }
}

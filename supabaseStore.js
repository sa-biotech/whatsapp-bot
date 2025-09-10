// supabaseStore.js

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
      .maybeSingle();

    if (error) {
      console.error("❌ sessionExists error:", error.message);
      return false;
    }
    return !!data;
  }

  // Load a session from DB
  async extract({ session }) {
    console.log("📥 Extracting session:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", session)
      .maybeSingle();

    if (error) {
      console.error("❌ extract error:", error.message);
      return {};
    }

    if (!data || !data.session) {
      console.log("⚠️ No session found in DB");
      return {};
    }

    return data.session; // must be JSON
  }

  // Save or update session
  async save({ session, data }) {
    console.log("📝 Saving session:", session);

    if (!data || Object.keys(data).length === 0) {
      console.warn("⚠️ Tried to save empty session, skipping.");
      return;
    }

    const { error } = await this.supabase
      .from(this.table)
      .upsert(
        { id: session, session: data }, // ✅ column is session (jsonb)
        { onConflict: "id" }
      );

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

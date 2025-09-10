// supabaseStore.js
export class SupabaseStore {
  constructor(supabase, table = "whatsapp_sessions") {
    this.supabase = supabase;
    this.table = table;
  }

  // Check if a session exists
  async sessionExists({ session }) {
    console.log("🔍 [SupabaseStore] Checking if session exists:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("id")
      .eq("id", session)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log("ℹ️ [SupabaseStore] No session found for:", session);
        return false;
      }
      console.error("❌ [SupabaseStore] sessionExists error:", error.message);
      return false;
    }
    return !!data;
  }

  // Load session from DB
  async extract({ session }) {
    console.log("📥 [SupabaseStore] Extracting session:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", session)
      .single();

    if (error || !data) {
      console.log("⚠️ [SupabaseStore] No session found in DB, returning null");
      return null;
    }
    console.log("✅ [SupabaseStore] Session loaded from DB:", session);
    return data.session;
  }

  // Save or update session
  async save({ session, data, ...rest }) {
    console.log("📝 [SupabaseStore] Saving session:", session);
    console.log("📦 [SupabaseStore] Raw session data:", data);
    console.log("🛠️ [SupabaseStore] Extra payload:", rest);

    if (!data) {
      console.log("⚠️ [SupabaseStore] Skip saving null session:", session);
      return;
    }

    const { error } = await this.supabase
      .from(this.table)
      .upsert({ id: session, session: data }, { onConflict: "id" });

    if (error) {
      console.error("❌ [SupabaseStore] Supabase save error:", error.message);
      throw new Error(error.message);
    }
    console.log("✅ [SupabaseStore] Session saved in DB");
  }

  // Delete session
  async delete({ session }) {
    console.log("🗑️ [SupabaseStore] Deleting session:", session);
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", session);

    if (error) {
      console.error("❌ [SupabaseStore] Supabase delete error:", error.message);
      throw new Error(error.message);
    }
    console.log("✅ [SupabaseStore] Session deleted from DB");
  }
}

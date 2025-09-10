// supabaseStore.js

export class SupabaseStore {
  constructor(supabase, table = "whatsapp_sessions") {
    this.supabase = supabase;
    this.table = table;
  }

  // --- Check if a session exists ---
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

    console.log("✅ [SupabaseStore] Session exists:", data.id);
    return !!data;
  }

  // --- Load session from DB ---
  async extract({ session }) {
    console.log("📥 [SupabaseStore] Extracting session:", session);
    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", session)
      .single();

    if (error || !data) {
      console.log("⚠️ [SupabaseStore] No session found in DB for:", session);
      return null;
    }

    console.log("✅ [SupabaseStore] Session loaded from DB");
    return data.session;
  }

  // --- Save or update session ---
  async save({ session, data }) {
    console.log("📝 [SupabaseStore] Saving session:", session);

    // Debug dump
    console.log("📦 [SupabaseStore] Raw session data:", JSON.stringify(data, null, 2));

    if (!data) {
      console.log("⚠️ [SupabaseStore] Skip saving null session:", session);
      return;
    }

    // Try storing as JSONB
    const payload = {
      id: session,
      session: data,
    };

    console.log("⬆️ [SupabaseStore] Upserting payload:", JSON.stringify(payload, null, 2));

    const { error } = await this.supabase
      .from(this.table)
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("❌ [SupabaseStore] Save error:", error.message);
      throw new Error(error.message);
    }

    console.log("✅ [SupabaseStore] Session saved in DB successfully");
  }

  // --- Delete session ---
  async delete({ session }) {
    console.log("🗑️ [SupabaseStore] Deleting session:", session);
    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", session);

    if (error) {
      console.error("❌ [SupabaseStore] Delete error:", error.message);
      throw new Error(error.message);
    }

    console.log("✅ [SupabaseStore] Session deleted from DB");
  }
}

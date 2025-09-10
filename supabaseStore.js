// supabaseStore.js
export class SupabaseStore {
  constructor(supabase, table = "whatsapp_sessions") {
    this.supabase = supabase;
    this.table = table;
  }

  // 🔍 Load session
  async get(session) {
    console.log("🔍 [SupabaseStore] Checking if session exists:", session);

    const { data, error } = await this.supabase
      .from(this.table)
      .select("session")
      .eq("id", session)
      .maybeSingle();

    if (error) {
      console.error("❌ [SupabaseStore] Load error:", error.message);
      throw new Error(error.message);
    }

    if (data?.session) {
      console.log("✅ [SupabaseStore] Found session:", session);
      return data.session;
    } else {
      console.log("ℹ️ [SupabaseStore] No session found for:", session);
      return null;
    }
  }

  // 💾 Save session
  async save({ session, data }) {
    console.log("📝 [SupabaseStore] Saving session:", session);
    console.log("📦 [SupabaseStore] Raw session data:", data);

    // Always save something, even if empty
    const payload = {
      id: session,
      session: data ?? {}, // store empty object if undefined
    };

    const { error } = await this.supabase
      .from(this.table)
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("❌ [SupabaseStore] Save error:", error.message);
      throw new Error(error.message);
    }

    console.log("✅ [SupabaseStore] Session saved in DB:", session);
  }

  // 🗑️ Delete session
  async delete(session) {
    console.log("🗑️ [SupabaseStore] Deleting session:", session);

    const { error } = await this.supabase
      .from(this.table)
      .delete()
      .eq("id", session);

    if (error) {
      console.error("❌ [SupabaseStore] Delete error:", error.message);
      throw new Error(error.message);
    }

    console.log("✅ [SupabaseStore] Deleted session:", session);
  }
}

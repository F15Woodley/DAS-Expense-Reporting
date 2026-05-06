import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, email } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    if (email === "rwoodley@digitalaerial.com") {
      return res.status(403).json({ error: "Primary admin cannot be deleted." });
    }

    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error." });
  }
}

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
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const safeRole = ["employee", "manager", "admin"].includes(role)
      ? role
      : "employee";

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user?.id;

    if (!userId) {
      return res.status(400).json({ error: "Invite created but no user ID returned." });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email,
        role: safeRole,
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error." });
  }
}

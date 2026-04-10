import { supabase } from "./supabaseClient";

export const expenseService = {
async list(role) {
  if (!supabase) throw new Error("Supabase client not initialized");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (role !== "manager") {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
},
  
async saveExpense(record) {
  if (!supabase) throw new Error("Supabase client not initialized");

  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("saveExpense failed:", err);
    throw err;
  }
},

    async updateExpense(id, record) {
    if (!supabase) throw new Error("Supabase client not initialized");
  
    const { data, error } = await supabase
      .from("expenses")
      .update(record)
      .eq("id", id)
      .select()
      .single();
  
    if (error) throw error;
    return data;
  },

  async deleteExpense(id) {
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) throw error;
},
  async uploadReceipt(file, userId) {
    if (!supabase) throw new Error("Supabase client not initialized");
    if (!file) return null;
    if (!userId) throw new Error("Missing user id for receipt upload");

    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `${userId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("receipts")
      .upload(filePath, file, { upsert: false });

    if (error) throw error;
    return filePath;
  },

async updateExpenseStatus(id, status) {
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from("expenses")
    .update({ status })
    .eq("id", id);

  if (error) throw error;

  return { id, status };
},
  mode() {
    return "Supabase";
  },
};

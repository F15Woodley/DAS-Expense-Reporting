import { supabase } from './supabaseClient'

export const expenseService = {
  async list() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async saveExpense(record) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([record])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async uploadReceipt(file) {
    if (!file) return null

    const filePath = `demo/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file)

    if (error) throw error
    return filePath
  },

  mode() {
    return 'Supabase'
  }
}

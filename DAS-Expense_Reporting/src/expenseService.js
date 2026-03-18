import { supabase } from './supabaseClient'

export const expenseService = {
  async list() {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  },

  async saveExpense(record) {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([record])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('saveExpense failed:', err)
      throw err
    }
  },

  async uploadReceipt(file) {
    if (!supabase) throw new Error('Supabase client not initialized')
    if (!file) return null

    const filePath = `demo/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file)

    if (error) throw error
    return filePath
  },

  async updateExpenseStatus(id, status) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('expenses')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  mode() {
    return 'Supabase'
  }
}

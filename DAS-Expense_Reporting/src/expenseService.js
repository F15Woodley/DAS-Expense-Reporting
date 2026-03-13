import { supabase } from './supabaseClient'

export const expenseService = {
  async list() {
    console.log("expenseService.list called")

    if (!supabase) {
      console.error("supabase client missing in list()")
      return []
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    console.log("list response", { data, error })

    if (error) throw error
    return data ?? []
  },

  async saveExpense(record) {
    console.log("expenseService.saveExpense called", record)

    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('expenses')
      .insert([record])
      .select()
      .single()

    console.log("saveExpense response", { data, error })

    if (error) throw error
    return data
  },

  async uploadReceipt(file) {
    console.log("expenseService.uploadReceipt called", file?.name)

    if (!supabase) throw new Error('Supabase client not initialized')
    if (!file) return null

    const filePath = `demo/${Date.now()}-${file.name}`

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file)

    console.log("uploadReceipt response", { data, error, filePath })

    if (error) throw error
    return filePath
  },

  mode() {
    return 'Supabase'
  }
}

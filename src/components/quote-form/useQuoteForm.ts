import { useMemo, useState } from 'react'
import type { QuoteFormData, QuoteItem, PaymentTermItem } from './types'
import { supabase } from '../../lib/supabaseClient'

export const useQuoteForm = () => {
  const [formData, setFormData] = useState<QuoteFormData>({
    owner: '',
    clientName: '',
    clientEmail: '',
    quoteUrl: 'https://quotes.timesheets.com/68124-AJ322ADV3',
    expires: '2025-07-08',
    paymentTerms: 'Net 30',
    items: [
      { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    legalese: '',
    clientComments: '',
    isAccepted: false,
    isDeclined: false,
    isRecurring: false,
    billingPeriod: '',
    quoteHistory: [
      { id: '1', version: 'Current Version', date: '', isCurrent: true },
      { id: '2', version: '03 - 07/08/25', date: '2025-07-08', isCurrent: false },
      { id: '3', version: '02 - 07/08/25', date: '2025-07-08', isCurrent: false },
      { id: '4', version: '01 - 07/03/25', date: '2025-07-03', isCurrent: false },
    ],
    selectedHistoryVersion: '2',
    isTaxEnabled: false,
    taxRate: 0.08,
    paymentSchedule: [
      { id: 'ps-1', percentage: 100, description: 'net 30 days' },
    ],
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice

  const recalc = (
    items: QuoteItem[] = formData.items,
    isTaxEnabled: boolean = formData.isTaxEnabled,
    taxRate: number = formData.taxRate
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = isTaxEnabled ? subtotal * taxRate : 0
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    const updatedItems = formData.items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = calculateItemTotal(updatedItem.quantity, updatedItem.unitPrice)
        }
        return updatedItem
      }
      return item
    })

    const { subtotal, tax, total } = recalc(updatedItems)

    setFormData({ ...formData, items: updatedItems, subtotal, tax, total })
  }

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }
    setFormData({ ...formData, items: [...formData.items, newItem] })
  }

  const removeItem = (id: string) => {
    if (formData.items.length <= 1) return
    const updatedItems = formData.items.filter((item) => item.id !== id)
    const { subtotal, tax, total } = recalc(updatedItems)
    setFormData({ ...formData, items: updatedItems, subtotal, tax, total })
  }

  const handleInputChange = (field: keyof QuoteFormData, value: string | number | boolean) => {
    const next = { ...formData, [field]: value } as QuoteFormData
    if (field === 'taxRate' || field === 'isTaxEnabled') {
      const { subtotal, tax, total } = recalc(next.items, next.isTaxEnabled, next.taxRate)
      next.subtotal = subtotal
      next.tax = tax
      next.total = total
    }
    setFormData(next)
  }

  const handleCheckboxChange = (field: keyof QuoteFormData, value: boolean) => {
    if (field === 'isTaxEnabled') {
      const { subtotal, tax, total } = recalc(formData.items, value, formData.taxRate)
      setFormData({ ...formData, isTaxEnabled: value, subtotal, tax, total })
      return
    }
    setFormData({ ...formData, [field]: value })
  }

  // Payment schedule helpers
  const updatePaymentTerm = (id: string, field: keyof PaymentTermItem, value: string | number) => {
    const updated = formData.paymentSchedule.map((t) =>
      t.id === id ? { ...t, [field]: field === 'percentage' ? Number(value) : value } : t
    )
    setFormData({ ...formData, paymentSchedule: updated })
  }

  const addPaymentTerm = () => {
    const newTerm: PaymentTermItem = { id: `ps-${Date.now()}`, percentage: 0, description: '' }
    setFormData({ ...formData, paymentSchedule: [...formData.paymentSchedule, newTerm] })
  }

  const removePaymentTerm = (id: string) => {
    setFormData({ ...formData, paymentSchedule: formData.paymentSchedule.filter((t) => t.id !== id) })
  }

  const paymentScheduleTotal = useMemo(
    () => formData.paymentSchedule.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0),
    [formData.paymentSchedule]
  )

    const saveQuote = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      // First, create or get the client
      let clientId = null
      if (formData.clientName || formData.clientEmail) {
        // Try to find existing client
        const { data: existingClients, error: searchError } = await supabase
          .from('clients')
          .select('id')
          .or(`name.eq.${formData.clientName},email.eq.${formData.clientEmail}`)

        if (searchError) throw searchError

        if (existingClients && existingClients.length > 0) {
          clientId = existingClients[0].id
        } else {
          // Create new client
          const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
              owner_id: '00000000-0000-0000-0000-000000000000', // TODO: Replace with actual auth.uid()
              name: formData.clientName || 'Unknown Client',
              email: formData.clientEmail,
              company: formData.clientName
            })
            .select()
            .single()

          if (createError) throw createError
          clientId = newClient.id
        }
      }

      // Create the quote
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          owner_id: '00000000-0000-0000-0000-000000000000', // TODO: Replace with actual auth.uid()
          client_id: clientId,
          status: 'draft',
          quote_number: formData.quoteUrl,
          expires_on: formData.expires,
          payment_terms: formData.paymentTerms,
          is_tax_enabled: formData.isTaxEnabled,
          tax_rate: formData.taxRate,
          subtotal: formData.subtotal,
          tax_amount: formData.tax,
          total_amount: formData.total,
          notes: formData.notes,
          legal_terms: formData.legalese,
          client_comments: formData.clientComments,
          is_recurring: formData.isRecurring,
          billing_period: formData.billingPeriod || null,
        })
        .select()
        .single()

      if (error) throw error

      const quoteId = quote.id

      // Insert quote items (note: line_total is computed automatically)
      const itemsPayload = formData.items.map((i) => ({
        quote_id: quoteId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        // line_total is computed automatically by the database
      }))

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      // Insert payment schedule
      const schedulePayload = formData.paymentSchedule.map((p, idx) => ({
        quote_id: quoteId,
        sequence: idx + 1,
        percentage: p.percentage,
        description: p.description,
      }))

      const { error: scheduleError } = await supabase.from('payment_schedule').insert(schedulePayload)
      if (scheduleError) throw scheduleError

      // Add new quote to history
      const newHistoryItem = {
        id: Date.now().toString(),
        version: `New - ${new Date().toLocaleDateString()}`,
        date: new Date().toLocaleDateString(),
        isCurrent: true
      }

      // Update all existing history items to not be current
      const updatedHistory = formData.quoteHistory.map(item => ({
        ...item,
        isCurrent: false
      }))

      // Add new item at the beginning
      setFormData(prev => ({
        ...prev,
        quoteHistory: [newHistoryItem, ...updatedHistory],
        selectedHistoryVersion: newHistoryItem.id
      }))

      setSaveMessage({ type: 'success', text: 'Quote saved successfully!' })
      return quote

    } catch (error) {
      console.error('Error saving quote:', error)
      setSaveMessage({ type: 'error', text: `Error saving quote: ${error instanceof Error ? error.message : 'Unknown error'}` })
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  return {
    formData,
    setFormData,
    updateItem,
    addItem,
    removeItem,
    handleInputChange,
    handleCheckboxChange,
    updatePaymentTerm,
    addPaymentTerm,
    removePaymentTerm,
    paymentScheduleTotal,
    saveQuote,
    isSaving,
    saveMessage,
  }
}

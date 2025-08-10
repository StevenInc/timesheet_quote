import { useMemo, useState, useEffect } from 'react'
import type { QuoteFormData, QuoteItem, PaymentTermItem } from './types'
import { supabase } from '../../lib/supabaseClient'

export const useQuoteForm = () => {
  const [formData, setFormData] = useState<QuoteFormData>({
    owner: '',
    clientName: '',
    clientEmail: '',
    quoteNumber: '1000',
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
    quoteHistory: [],
    selectedHistoryVersion: '',
    isTaxEnabled: false,
    taxRate: 0.08,
    paymentSchedule: [
      { id: 'ps-1', percentage: 100, description: 'net 30 days' },
    ],
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Load quote history when component mounts
  useEffect(() => {
    loadQuoteHistory()
  }, [])

  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice

  const loadQuoteHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          created_at,
          notes,
          status,
          client_id,
          clients(name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (quotes && quotes.length > 0) {
        console.log('Loaded quotes:', quotes) // Debug log

        const historyItems = quotes.map((quote, index) => {
          // Extract quote number from the URL or use the quote_number field
          let extractedQuoteNumber = '1000'
          if (quote.quote_number) {
            // If quote_number looks like a URL, extract the number part
            if (quote.quote_number.includes('http')) {
              // Extract number from URL like "https://quotes.timesheets.com/68124-AJ322ADV3-v3"
              const match = quote.quote_number.match(/(\d+)-[A-Z0-9]+-v\d+/)
              if (match) {
                extractedQuoteNumber = match[1]
              }
            } else {
              // If it's already a number, use it directly
              extractedQuoteNumber = quote.quote_number
            }
          }

          return {
            id: quote.id,
            version: `v${quotes.length - index}`,
            date: new Date(quote.created_at).toLocaleDateString(),
            isCurrent: index === 0,
            notes: quote.notes || '',
            clientName: quote.clients?.name || 'Unknown Client',
            status: quote.status,
            quoteNumber: extractedQuoteNumber
          }
        })

        setFormData(prev => ({
          ...prev,
          quoteHistory: historyItems,
          selectedHistoryVersion: historyItems[0]?.id || ''
        }))

        // Set the current quote number to the next available number
        const quoteNumbers = quotes.map(q => {
          let extractedNumber = '1000'
          if (q.quote_number) {
            if (q.quote_number.includes('http')) {
              const match = q.quote_number.match(/(\d+)-[A-Z0-9]+-v\d+/)
              if (match) {
                extractedNumber = match[1]
              }
            } else {
              extractedNumber = q.quote_number
            }
          }
          return parseInt(extractedNumber)
        }).filter(num => !isNaN(num))

        if (quoteNumbers.length > 0) {
          const maxNumber = Math.max(...quoteNumbers)
          setFormData(prev => ({
            ...prev,
            quoteNumber: (maxNumber + 1).toString()
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            quoteNumber: '1000'
          }))
        }
      } else {
        // No quotes found, set default quote number
        setFormData(prev => ({
          ...prev,
          quoteNumber: '1000'
        }))
      }
    } catch (error) {
      console.error('Error loading quote history:', error)
      setSaveMessage({ type: 'error', text: `Error loading history: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setIsLoadingHistory(false)
    }
  }

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
          quote_number: formData.quoteNumber,
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

      // Reload the quote history to include the new quote
      await loadQuoteHistory()

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
    isLoadingHistory,
    loadQuoteHistory,
  }
}

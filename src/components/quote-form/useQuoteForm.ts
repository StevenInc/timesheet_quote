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
    taxRate: 0.08,
    isTaxEnabled: false,
    paymentTerms: 'Net 30',
    items: [
      { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    legalTerms: '',
    clientComments: '',
    isRecurring: false,
    billingPeriod: '',
    recurringAmount: 0,
    quoteHistory: [],
    selectedHistoryVersion: '',
    paymentSchedule: [
      { id: 'ps-1', percentage: 100, description: 'net 30 days' },
    ],
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // New Quote Modal State
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false)
  const [newQuoteNumber, setNewQuoteNumber] = useState('')

  // Load quote history when component mounts
  useEffect(() => {
    loadQuoteHistory()
  }, [])

  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice

  const loadQuoteHistory = async () => {
    setIsLoadingHistory(true)
    try {
      // Use the new quote_history view for easier access
      const { data: quoteHistory, error } = await supabase
        .from('quote_history')
        .select('*')
        .order('quote_number', { ascending: false })
        .order('revision_number', { ascending: false })

      if (error) throw error

      if (quoteHistory && quoteHistory.length > 0) {
        console.log('Loaded quote history:', quoteHistory) // Debug log

        const historyItems = quoteHistory.map((quote) => ({
          id: quote.revision_id,
          quoteId: quote.quote_id,
          quoteNumber: quote.quote_number,
          versionNumber: quote.revision_number,
          version: `v${quote.revision_number}`,
          date: new Date(quote.created_at).toLocaleDateString(),
          isCurrent: quote.revision_number === 1, // Revision 1 is always current
          notes: quote.notes || '',
          clientName: quote.client_name || 'Unknown Client',
          status: quote.status
        }))

        setFormData(prev => ({
          ...prev,
          quoteHistory: historyItems,
          selectedHistoryVersion: historyItems[0]?.id || ''
        }))

        // Set the current quote number to the next available number
        const quoteNumbers = quoteHistory
          .map(q => parseInt(q.quote_number))
          .filter(num => !isNaN(num))

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

      // Provide more detailed error information for debugging
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error)
      }

      console.error('Detailed error info:', {
        error,
        errorType: typeof error,
        errorMessage,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      })

      setSaveMessage({ type: 'error', text: `Error loading history: ${errorMessage}` })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // New Quote Modal Functions
  const openNewQuoteModal = () => {
    // Set the default quote number to the next available number
    setNewQuoteNumber(formData.quoteNumber)
    setIsNewQuoteModalOpen(true)
  }

  const closeNewQuoteModal = () => {
    setIsNewQuoteModalOpen(false)
    setNewQuoteNumber('')
  }

  const createNewQuote = () => {
    if (newQuoteNumber.trim()) {
      // Reset form data for new quote
      setFormData({
        owner: '',
        clientName: '',
        clientEmail: '',
        quoteNumber: newQuoteNumber.trim(),
        quoteUrl: `https://quotes.timesheets.com/${newQuoteNumber.trim()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        expires: '2025-07-08',
        taxRate: 0.08,
        isTaxEnabled: false,
        paymentTerms: 'Net 30',
        items: [
          { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
        ],
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: '',
        legalTerms: '',
        clientComments: '',
        isRecurring: false,
        billingPeriod: '',
        recurringAmount: 0,
        quoteHistory: [],
        selectedHistoryVersion: '',
        paymentSchedule: [
          { id: 'ps-1', percentage: 100, description: 'net 30 days' },
        ],
      })

      closeNewQuoteModal()
      setSaveMessage({ type: 'success', text: `New quote ${newQuoteNumber.trim()} created!` })
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
              name: formData.clientName || 'Unknown Client',
              email: formData.clientEmail
            })
            .select()
            .single()

          if (createError) throw createError
          clientId = newClient.id
        }
      }

      // Create the base quote (only core quote data)
      const { data: quote, error } = await supabase
        .from('quotes')
        .insert({
          owner_id: '00000000-0000-0000-0000-000000000000', // TODO: Replace with actual auth.uid()
          client_id: clientId,
          status: 'draft',
          quote_number: formData.quoteNumber
        })
        .select()
        .single()

      if (error) throw error

      const quoteId = quote.id

      // Create the first revision of the quote
      const { data: quoteRevision, error: revisionError } = await supabase
        .from('quote_revisions')
        .insert({
          quote_id: quoteId,
          revision_number: 1,
          status: 'draft',
          expires_on: formData.expires,
          tax_rate: formData.taxRate,
          is_tax_enabled: formData.isTaxEnabled,
          notes: formData.notes,
          is_recurring: formData.isRecurring,
          billing_period: formData.billingPeriod || null,
          recurring_amount: formData.recurringAmount || null
        })
        .select()
        .single()

      if (revisionError) throw revisionError

      const revisionId = quoteRevision.id

      // Insert quote items for this revision
      const itemsPayload = formData.items.map((i) => ({
        quote_revision_id: revisionId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total: i.total,
        sort_order: 0
      }))

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload)
      if (itemsError) throw itemsError

      // Insert payment terms for this revision
      const paymentTermsPayload = formData.paymentSchedule.map((p, idx) => ({
        quote_revision_id: revisionId,
        percentage: p.percentage,
        description: p.description,
        sort_order: idx
      }))

      const { error: paymentTermsError } = await supabase.from('payment_terms').insert(paymentTermsPayload)
      if (paymentTermsError) throw paymentTermsError

      // Insert legal terms for this revision
      if (formData.legalTerms) {
        const { error: legalTermsError } = await supabase
          .from('legal_terms')
          .insert({
            quote_revision_id: revisionId,
            terms: formData.legalTerms
          })
        if (legalTermsError) throw legalTermsError
      }

      // Insert client comments for this revision
      if (formData.clientComments) {
        const { error: clientCommentsError } = await supabase
          .from('client_comments')
          .insert({
            quote_id: quoteId,
            quote_revision_id: revisionId,
            comment: formData.clientComments
          })
        if (clientCommentsError) throw clientCommentsError
      }

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
    // New Quote Modal
    isNewQuoteModalOpen,
    newQuoteNumber,
    openNewQuoteModal,
    closeNewQuoteModal,
    createNewQuote,
    setNewQuoteNumber,
  }
}

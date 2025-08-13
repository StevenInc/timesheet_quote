import React, { useMemo, useState, useEffect } from 'react'
import type { QuoteFormData, QuoteItem, PaymentTermItem, NewQuoteModalData, QuoteHistory, DatabaseQuote, DatabaseQuoteRevision, DatabaseQuoteItem, DatabasePaymentTerm, ClientQuote, DatabaseClient } from './types'
import { supabase } from '../../lib/supabaseClient'
import { EmailService } from '../../lib/emailService'

export const useQuoteForm = () => {
  // Helper function to get default expiration date (30 days from today)
  const getDefaultExpirationDate = () => {
    const today = new Date()
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    return thirtyDaysFromNow.toISOString().split('T')[0] // Format as YYYY-MM-DD
  }

  // Helper function to validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Helper function to check if form data has changed from original
  const checkFormChanges = (currentData: QuoteFormData, originalData: QuoteFormData | null): boolean => {
    if (!originalData) return false

    // Deep comparison of key fields that would affect the quote
    return (
      currentData.owner !== originalData.owner ||
      currentData.clientName !== originalData.clientName ||
      currentData.clientEmail !== originalData.clientEmail ||
      currentData.expires !== originalData.expires ||
      currentData.taxRate !== originalData.taxRate ||
      currentData.isTaxEnabled !== originalData.isTaxEnabled ||
      currentData.notes !== originalData.notes ||
      currentData.legalTerms !== originalData.legalTerms ||
      currentData.clientComments !== originalData.clientComments ||
      currentData.isRecurring !== originalData.isRecurring ||
      currentData.billingPeriod !== originalData.billingPeriod ||
      currentData.recurringAmount !== originalData.recurringAmount ||
      currentData.sentViaEmail !== originalData.sentViaEmail ||
      JSON.stringify(currentData.items) !== JSON.stringify(originalData.items) ||
      JSON.stringify(currentData.paymentSchedule) !== JSON.stringify(originalData.paymentSchedule)
    )
  }

  const [formData, setFormData] = useState<QuoteFormData>({
    owner: '',
    clientName: '',
    clientEmail: '',
    quoteNumber: '1000',
    quoteUrl: 'https://quotes.timesheets.com/68124-AJ322ADV3',
    expires: getDefaultExpirationDate(),
    taxRate: 0.08,
    isTaxEnabled: false,
    paymentTerms: 'Net 30',
    items: [
      { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    title: '',
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
    sentViaEmail: false
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Client Quotes State
  const [clientQuotes, setClientQuotes] = useState<ClientQuote[]>([])
  const [isLoadingClientQuotes, setIsLoadingClientQuotes] = useState(false)
  const [selectedClientQuote, setSelectedClientQuoteState] = useState<string>('')

  // Custom setter with guards to prevent unnecessary updates
  const setSelectedClientQuote = React.useCallback((quoteId: string) => {
    console.log('setSelectedClientQuote called with:', quoteId, 'current:', selectedClientQuote)
    if (selectedClientQuote === quoteId) {
      console.log('Same quote already selected, skipping update:', quoteId)
      return
    }
    console.log('Setting selected client quote:', quoteId)
    setSelectedClientQuoteState(quoteId)
  }, [selectedClientQuote])

  // Quote Revisions State
  const [quoteRevisions, setQuoteRevisions] = useState<DatabaseQuoteRevision[]>([])
  const [isLoadingQuoteRevisions, setIsLoadingQuoteRevisions] = useState(false)
  const [currentLoadedRevisionId, setCurrentLoadedRevisionId] = useState<string | null>(null)
  const [currentLoadedQuoteId, setCurrentLoadedQuoteId] = useState<string | null>(null)

  // New Quote Modal State
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false)
  const [newQuoteData, setNewQuoteData] = useState<NewQuoteModalData>({
    quoteNumber: '',
    clientName: '',
    clientEmail: ''
  })
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)

  // View Quote Modal State
  const [isViewQuoteModalOpen, setIsViewQuoteModalOpen] = useState(false)
  const [availableClients, setAvailableClients] = useState<DatabaseClient[]>([])
  const [isLoadingAvailableClients, setIsLoadingAvailableClients] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Title modal state
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false)
  const [pendingQuoteData, setPendingQuoteData] = useState<QuoteFormData | null>(null)
  const [pendingQuoteId, setPendingQuoteId] = useState<string | null>(null)
  const [pendingRevisionId, setPendingRevisionId] = useState<string | null>(null)

  // Track original form data to detect changes
  const [originalFormData, setOriginalFormData] = useState<QuoteFormData | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load next quote number when component mounts
  useEffect(() => {
    console.log('Component mounted, initial newQuoteData:', newQuoteData)
    loadNextQuoteNumber()
  }, [])

  const calculateItemTotal = (quantity: number, unitPrice: number) => quantity * unitPrice

  const loadQuoteHistory = async (quoteId?: string) => {
    setIsLoadingHistory(true)
    try {
      if (quoteId) {
        // Load history for a specific quote
        const { data: quoteHistory, error } = await supabase
          .from('quote_history')
          .select('*')
          .eq('quote_id', quoteId)
          .order('revision_number', { ascending: false })

        if (error) throw error

        if (quoteHistory && quoteHistory.length > 0) {
          console.log('Loaded quote history for quote ID:', quoteId, quoteHistory)

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
        } else {
          // No revisions found for this quote
          setFormData(prev => ({
            ...prev,
            quoteHistory: [],
            selectedHistoryVersion: ''
          }))
        }
      } else {
        // No quote ID provided, clear history
        setFormData(prev => ({
          ...prev,
          quoteHistory: [],
          selectedHistoryVersion: ''
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

  const loadNextQuoteNumber = async () => {
    console.log('loadNextQuoteNumber called, current newQuoteData:', newQuoteData)
    try {
      // Get all quote numbers to determine the next available one
      const { data: quoteNumbers, error } = await supabase
        .from('quotes')
        .select('quote_number')
        .order('quote_number', { ascending: false })
        .limit(1)

      if (error) throw error

      let nextQuoteNumber = '1000'

      if (quoteNumbers && quoteNumbers.length > 0) {
        const maxNumber = parseInt(quoteNumbers[0].quote_number)
        if (!isNaN(maxNumber)) {
          nextQuoteNumber = (maxNumber + 1).toString()
        }
      }

      // Update both the form data and the new quote modal data
      setFormData(prev => ({
        ...prev,
        quoteNumber: nextQuoteNumber
      }))

      setNewQuoteData(prev => {
        const newData = {
          ...prev,
          quoteNumber: nextQuoteNumber
        }
        console.log('loadNextQuoteNumber: updating newQuoteData from', prev, 'to', newData)
        return newData
      })

      console.log('Next available quote number:', nextQuoteNumber)
      console.log('loadNextQuoteNumber completed successfully')
    } catch (error) {
      console.error('Error loading next quote number:', error)
      // Set default quote number on error
      const defaultNumber = '1000'
      setFormData(prev => ({
        ...prev,
        quoteNumber: defaultNumber
      }))
      setNewQuoteData(prev => {
        const newData = {
          ...prev,
          quoteNumber: defaultNumber
        }
        console.log('loadNextQuoteNumber error case: updating newQuoteData from', prev, 'to', newData)
        return newData
      })
      console.log('loadNextQuoteNumber completed with error')
    }
  }

  const loadQuote = async (quoteId: string) => {
    try {
      // Load the quote details
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          clients(name, email),
          quote_revisions(
            *,
            quote_items(*),
            payment_terms(*),
            legal_terms(*),
            client_comments(*)
          )
        `)
        .eq('id', quoteId)
        .single()

      if (quoteError) throw quoteError

      if (quote) {
        // Get the latest revision (revision 1 is always the current one)
        const latestRevision = (quote as DatabaseQuote).quote_revisions?.[0] as DatabaseQuoteRevision | undefined

        if (latestRevision) {
          // Update form data with the loaded quote
          setFormData(prev => ({
            ...prev,
            quoteNumber: quote.quote_number,
            clientName: quote.clients?.name || '',
            clientEmail: quote.clients?.email || '',
            expires: latestRevision.expires_on || getDefaultExpirationDate(),
            taxRate: latestRevision.tax_rate || 0.08,
            isTaxEnabled: latestRevision.is_tax_enabled || false,
            title: latestRevision.title || '',
            notes: latestRevision.notes || '',
            isRecurring: latestRevision.is_recurring || false,
            billingPeriod: latestRevision.billing_period || '',
            recurringAmount: latestRevision.recurring_amount || 0,
            items: latestRevision.quote_items?.map((item: DatabaseQuoteItem) => ({
              id: item.id,
              description: item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unit_price || 0,
              total: item.total || 0
            })) || [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
            paymentSchedule: latestRevision.payment_terms?.map((term: DatabasePaymentTerm) => ({
              id: term.id,
              percentage: term.percentage || 100,
              description: term.description || ''
            })) || [{ id: 'ps-1', percentage: 100, description: 'net 30 days' }],
            legalTerms: latestRevision.legal_terms?.[0]?.terms || '',
            clientComments: latestRevision.client_comments?.[0]?.comment || ''
          }))

          // Load the quote history
          await loadQuoteHistory(quoteId)
        }
      }
    } catch (error) {
      console.error('Error loading quote:', error)
      setSaveMessage({ type: 'error', text: `Error loading quote: ${error instanceof Error ? error.message : 'Unknown error'}` })
    }
  }

  const loadClientQuotes = React.useCallback(async (clientId: string) => {
    setIsLoadingClientQuotes(true)
    try {
      // Get all non-archived quotes for the specified client with their latest revision notes and dates
      console.log('Loading client quotes for client ID:', clientId)
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          status,
          created_at,
          updated_at,
          quote_revisions(id, revision_number, title, notes, updated_at, status, sent_via_email)
        `)
        .eq('client_id', clientId)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (quotes && quotes.length > 0) {
        console.log('Loaded client quotes for client ID:', clientId, quotes)
        console.log('Sample quote structure:', quotes[0])
        console.log('Sample quote revisions:', quotes[0]?.quote_revisions)

        const clientQuoteItems = quotes.map((quote) => {
          const revisions = quote.quote_revisions || []
          const latestRevision = Math.max(...revisions.map(r => r.revision_number), 0)
          const latestRevisionData = revisions.find(r => r.revision_number === latestRevision)

          // Debug logging to see what data we're getting
          console.log('Quote:', quote.quote_number, 'Latest revision data:', latestRevisionData)

          // Determine the most primary status from all revisions
          const determineMostPrimaryStatus = (revisions: Array<{status: string, sent_via_email?: boolean}>) => {
            // Priority order: PAID > ACCEPTED > REJECTED > EXPIRED > EMAIL SENT > DRAFT
            const priorityOrder = ['PAID', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'EMAILED', 'DRAFT']

            // Check if any revision was sent via email
            const hasEmailSent = revisions.some(r => r.sent_via_email === true)

            // Get all statuses from revisions only
            const revisionStatuses = revisions.map(r => r.status).filter(Boolean)

            // If any revision was sent via email, return EMAILED
            if (hasEmailSent) {
              return 'EMAILED'
            }

            // Find the highest priority status from revisions only
            for (const priorityStatus of priorityOrder) {
              if (revisionStatuses.includes(priorityStatus)) {
                return priorityStatus
              }
            }

            // Default to DRAFT if no statuses found
            return 'DRAFT'
          }

          const mostPrimaryStatus = determineMostPrimaryStatus(revisions)

          return {
            id: quote.id,
            quoteNumber: quote.quote_number,
            status: mostPrimaryStatus,
            createdAt: new Date(quote.created_at).toLocaleDateString(),
            updatedAt: new Date(quote.updated_at).toLocaleDateString(),
            latestRevisionNumber: latestRevision,
            totalRevisions: revisions.length,
            title: latestRevisionData?.title || '',
            notes: latestRevisionData?.notes || '',
            lastUpdated: latestRevisionData?.updated_at ?
              new Date(latestRevisionData.updated_at).toLocaleDateString() :
              new Date(quote.updated_at).toLocaleDateString()
          }
        })

        setClientQuotes(clientQuoteItems)
        setSelectedClientQuote('')
      } else {
        // No quotes found for this client
        setClientQuotes([])
        setSelectedClientQuote('')
      }
    } catch (error) {
      console.error('Error loading client quotes:', error)
      setSaveMessage({ type: 'error', text: `Error loading client quotes: ${error instanceof Error ? error.message : 'Unknown error'}` })
      setClientQuotes([])
      setSelectedClientQuote('')
    } finally {
      setIsLoadingClientQuotes(false)
    }
  }, [])

  // New Quote Modal Functions
  const openNewQuoteModal = React.useCallback(async () => {
    // Always get a fresh, unique quote number when opening the modal
    console.log('Opening new quote modal, current newQuoteData:', newQuoteData)
    console.log('About to call loadNextQuoteNumber...')
    await loadNextQuoteNumber()
    console.log('After loading next quote number, newQuoteData:', newQuoteData)
    console.log('Setting modal to open...')
    setIsNewQuoteModalOpen(true)
    console.log('Modal should now be open')
  }, [newQuoteData])

  const closeNewQuoteModal = React.useCallback(() => {
    console.log('Closing new quote modal, current newQuoteData:', newQuoteData)
    setIsNewQuoteModalOpen(false)
    setNewQuoteData({ quoteNumber: '', clientName: '', clientEmail: '' })
    console.log('Reset newQuoteData to empty values')
    setClientSuggestions([])
  }, [newQuoteData])

  const searchClients = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setClientSuggestions([])
      return
    }

    setIsLoadingClients(true)
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('name')
        .ilike('name', `%${searchTerm}%`)
        .limit(10)

      if (error) throw error

      const names = clients?.map(client => client.name).filter(Boolean) || []
      setClientSuggestions(names)
    } catch (error) {
      console.error('Error searching clients:', error)
      setClientSuggestions([])
    } finally {
      setIsLoadingClients(false)
    }
  }

  const updateNewQuoteData = (field: keyof NewQuoteModalData, value: string) => {
    console.log('updateNewQuoteData called with field:', field, 'value:', value)
    setNewQuoteData(prev => {
      const newData = { ...prev, [field]: value }
      console.log('New quote data after update:', newData)
      return newData
    })
  }

  const createNewQuote = async () => {
    setIsCreatingQuote(true)
    try {
      console.log('Creating new quote with data:', newQuoteData)
      console.log('Form data before save:', formData)
      console.log('Email from modal:', newQuoteData.clientEmail)
      console.log('Email type:', typeof newQuoteData.clientEmail)
      console.log('Email length:', newQuoteData.clientEmail?.length)

      // Validate required fields
      if (!newQuoteData.quoteNumber?.trim()) {
        throw new Error('Quote number is required')
      }
      if (!newQuoteData.clientName?.trim()) {
        throw new Error('Client name is required')
      }

      // Validate client email if provided
      if (newQuoteData.clientEmail && newQuoteData.clientEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(newQuoteData.clientEmail.trim())) {
          throw new Error('Please enter a valid email address for the client.')
        }
      }

      // Clear any loaded revision state
      clearLoadedRevisionState()

      // Create the quote using the existing saveQuote function
      const dataToPass = {
        ...formData,
        quoteNumber: newQuoteData.quoteNumber,
        clientName: newQuoteData.clientName,
        clientEmail: newQuoteData.clientEmail || '',
        items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
        subtotal: 0,
        tax: 0,
        total: 0
      }
      console.log('Data being passed to saveQuote:', dataToPass)
      console.log('Client email being passed:', dataToPass.clientEmail)

      const result = await saveQuote(dataToPass, false) // Don't open title modal for new quotes

      if (result.success) {
        console.log('New quote created successfully:', result.quoteId)
        setSaveMessage({ type: 'success', text: 'New quote created successfully!' })
        closeNewQuoteModal()

        // Reset form data to defaults
        const newFormData = {
          ...formData,
          quoteNumber: newQuoteData.quoteNumber,
          clientName: newQuoteData.clientName,
          clientEmail: newQuoteData.clientEmail || '',
          expires: getDefaultExpirationDate(), // Set fresh expiration date
          items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
          subtotal: 0,
          tax: 0,
          total: 0,
          notes: '',
          legalTerms: '',
          clientComments: '',
          isRecurring: false,
          billingPeriod: '',
          recurringAmount: 0,
          paymentSchedule: [{ id: 'ps-1', percentage: 100, description: 'net 30 days' }]
        }

        setFormData(newFormData)

        // Reset change tracking for new quote
        setOriginalFormData(newFormData)
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error creating new quote:', error)
      setSaveMessage({ type: 'error', text: `Error creating new quote: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setIsCreatingQuote(false)
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

  const clearLoadedRevisionState = () => {
    setCurrentLoadedRevisionId(null)
    setCurrentLoadedQuoteId(null)
  }

  const resetForm = () => {
    const defaultFormData = {
      owner: '',
      clientName: '',
      clientEmail: '',
      quoteNumber: '1000',
      quoteUrl: 'https://quotes.timesheets.com/68124-AJ322ADV3',
      expires: getDefaultExpirationDate(),
      taxRate: 0.08,
      isTaxEnabled: false,
      paymentTerms: 'Net 30',
      items: [
        { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 },
      ],
      subtotal: 0,
      tax: 0,
      total: 0,
      title: '',
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
      sentViaEmail: false
    }

    setFormData(defaultFormData)
    clearLoadedRevisionState()

    // Reset change tracking
    setOriginalFormData(defaultFormData)
    setHasUnsavedChanges(false)
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

    const newFormData = { ...formData, items: updatedItems, subtotal, tax, total }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }
    const newFormData = { ...formData, items: [...formData.items, newItem] }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  const removeItem = (id: string) => {
    if (formData.items.length <= 1) return
    const updatedItems = formData.items.filter((item) => item.id !== id)
    const { subtotal, tax, total } = recalc(updatedItems)
    const newFormData = { ...formData, items: updatedItems, subtotal, tax, total }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  const handleInputChange = (field: keyof QuoteFormData, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }

      // Check if this change creates unsaved changes
      const hasChanges = checkFormChanges(newData, originalFormData)
      setHasUnsavedChanges(hasChanges)

      return newData
    })

    // If client name changes, load their quotes
    if (field === 'clientName' && typeof value === 'string' && value.trim()) {
      loadClientQuotesByName(value.trim())
    }
  }

  const handleCheckboxChange = (field: keyof QuoteFormData, value: boolean) => {
    if (field === 'isTaxEnabled') {
      const { subtotal, tax, total } = recalc(formData.items, value, formData.taxRate)
      const newFormData = { ...formData, isTaxEnabled: value, subtotal, tax, total }

      // Check if this change creates unsaved changes
      const hasChanges = checkFormChanges(newFormData, originalFormData)
      setHasUnsavedChanges(hasChanges)

      setFormData(newFormData)
      return
    }

    const newFormData = { ...formData, [field]: value }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  // Payment schedule helpers
  const updatePaymentTerm = (id: string, field: keyof PaymentTermItem, value: string | number) => {
    const updated = formData.paymentSchedule.map((t) =>
      t.id === id ? { ...t, [field]: field === 'percentage' ? Number(value) : value } : t
    )
    const newFormData = { ...formData, paymentSchedule: updated }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  const addPaymentTerm = () => {
    const newTerm: PaymentTermItem = { id: `ps-${Date.now()}`, percentage: 0, description: '' }
    const newFormData = { ...formData, paymentSchedule: [...formData.paymentSchedule, newTerm] }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  const removePaymentTerm = (id: string) => {
    const newFormData = { ...formData, paymentSchedule: formData.paymentSchedule.filter((t) => t.id !== id) }

    // Check if this change creates unsaved changes
    const hasChanges = checkFormChanges(newFormData, originalFormData)
    setHasUnsavedChanges(hasChanges)

    setFormData(newFormData)
  }

  const paymentScheduleTotal = useMemo(
    () => formData.paymentSchedule.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0),
    [formData.paymentSchedule]
  )

  const saveQuote = async (quoteData?: QuoteFormData, openTitleModalAfterSave: boolean = true) => {
    const dataToSave = quoteData || formData
    setIsSaving(true)
    setSaveMessage(null)

    try {
      console.log('Starting to save quote with data:', dataToSave)

      // Validate required fields
      if (!dataToSave.quoteNumber?.trim()) {
        throw new Error('Quote number is required')
      }
      if (!dataToSave.clientName?.trim()) {
        throw new Error('Client name is required')
      }
      if (!dataToSave.items || dataToSave.items.length === 0) {
        throw new Error('At least one quote item is required')
      }

      // First, create or get the client (SAVEQUOTE FUNCTION)
      let clientId = null
      console.log('About to process client creation...')
      console.log('Client name from dataToSave:', dataToSave.clientName)
      console.log('Client email from dataToSave:', dataToSave.clientEmail)
      console.log('Client email type:', typeof dataToSave.clientEmail)
      console.log('Client email length:', dataToSave.clientEmail?.length)
      console.log('Client email trimmed:', dataToSave.clientEmail?.trim())
      console.log('Will create client:', !!(dataToSave.clientName || dataToSave.clientEmail))

      if (dataToSave.clientName || dataToSave.clientEmail) {
        console.log('Processing client:', { name: dataToSave.clientName, email: dataToSave.clientEmail })

        // Try to find existing client by name first (SAVEQUOTE FUNCTION)
        const { data: existingClients, error: searchError } = await supabase
          .from('clients')
          .select('id')
          .eq('name', dataToSave.clientName)

        if (searchError) {
          console.error('Error searching for existing client:', searchError)
          throw searchError
        }

        if (existingClients && existingClients.length > 0) {
          clientId = existingClients[0].id
          console.log('Found existing client with ID:', clientId)

          // Check if the client's email has changed and update it
          const { data: currentClient, error: clientFetchError } = await supabase
            .from('clients')
            .select('email')
            .eq('id', clientId)
            .single()

          if (clientFetchError) {
            console.error('Error fetching current client data:', clientFetchError)
          } else {
            console.log('🔍 DEBUG: Checking if client email needs update...')
            console.log('🔍 Current client email in DB:', currentClient?.email)
            console.log('🔍 New email from form:', dataToSave.clientEmail)
            console.log('🔍 Trimmed new email:', dataToSave.clientEmail?.trim())
            console.log('🔍 Emails are different?', currentClient?.email !== dataToSave.clientEmail?.trim())
            console.log('🔍 New email is empty?', dataToSave.clientEmail?.trim() === '')
            console.log('🔍 New email is valid?', dataToSave.clientEmail?.trim() ? isValidEmail(dataToSave.clientEmail.trim()) : 'N/A')

            // Test if we can actually update this client record
            console.log('🧪 Testing database permissions...')
            const testUpdate = await supabase
              .from('clients')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', clientId)
              .select('id, updated_at')

            if (testUpdate.error) {
              console.error('❌ Database permission test failed:', testUpdate.error)
              console.error('❌ This suggests an RLS policy or permission issue')
            } else {
              console.log('✅ Database permission test passed, can update client records')
            }

            if (currentClient &&
                dataToSave.clientEmail?.trim() !== currentClient.email &&
                (dataToSave.clientEmail?.trim() === '' || isValidEmail(dataToSave.clientEmail.trim()))) {
              console.log('✅ Client email has changed, updating client record...')
              console.log('📧 Old email:', currentClient.email)
              console.log('📧 New email:', dataToSave.clientEmail?.trim() || '(empty)')

              const { error: updateError } = await supabase
                .from('clients')
                .update({ email: dataToSave.clientEmail?.trim() || '' })
                .eq('id', clientId)

              if (updateError) {
                console.error('❌ Error updating client email:', updateError)
              } else {
                console.log('✅ Successfully updated client email in database')

                // Verify the update actually worked by fetching the client again
                const { data: verifyClient, error: verifyError } = await supabase
                  .from('clients')
                  .select('email')
                  .eq('id', clientId)
                  .single()

                if (verifyError) {
                  console.error('❌ Error verifying client update:', verifyError)
                } else {
                  console.log('🔍 Verification - Client email in DB after update:', verifyClient?.email)
                  console.log('🔍 Verification - Expected email:', dataToSave.clientEmail?.trim() || '(empty)')
                  console.log('🔍 Verification - Update successful?', verifyClient?.email === (dataToSave.clientEmail?.trim() || ''))
                }

                // Show a brief success message for email update
                const newEmail = dataToSave.clientEmail?.trim() || '(empty)'
                setSaveMessage({ type: 'success', text: `Client email updated to ${newEmail}` })
              }
            } else {
              console.log('ℹ️ No email update needed or email validation failed')
              if (currentClient && dataToSave.clientEmail?.trim() === currentClient.email) {
                console.log('ℹ️ Emails are identical, no update needed')
              } else if (dataToSave.clientEmail?.trim() && !isValidEmail(dataToSave.clientEmail.trim())) {
                console.log('⚠️ New email format is invalid, skipping update')
              }
            }
          }
        } else {
          console.log('Creating new client...')
          // Create new client - ensure we have a valid email (SAVEQUOTE FUNCTION)
          console.log('Raw client email before trim:', dataToSave.clientEmail)
          console.log('Client email after trim:', dataToSave.clientEmail?.trim())
          console.log('Fallback email:', `${dataToSave.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`)

          // Better email validation - check if email is actually provided and valid
          const providedEmail = dataToSave.clientEmail?.trim()
          const clientEmail = providedEmail && providedEmail.length > 0 && isValidEmail(providedEmail)
            ? providedEmail
            : `${dataToSave.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`

          if (clientEmail !== providedEmail) {
            console.log('⚠️ Using fallback email because provided email was invalid or empty')
            console.log('Provided email:', JSON.stringify(providedEmail))
            console.log('Fallback email:', clientEmail)
          }

          console.log('Final client email to use:', clientEmail)
          console.log('Creating client with email:', clientEmail, 'from form data:', dataToSave.clientEmail)

          const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
              name: dataToSave.clientName || 'Unknown Client',
              email: clientEmail
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating new client:', createError)
            throw createError
          }
          clientId = newClient.id
          console.log('Created new client with ID:', clientId)
        }
      }

      // Ensure we have a client ID - create a default client if none exists
      if (!clientId) {
        console.log('No client specified, creating default client...')
        const { data: defaultClient, error: defaultClientError } = await supabase
          .from('clients')
          .insert({
            name: 'Default Client',
            email: 'default@example.com'
          })
          .select()
          .single()

        if (defaultClientError) {
          console.error('Error creating default client:', defaultClientError)
          throw defaultClientError
        }
        clientId = defaultClient.id
        console.log('Created default client with ID:', clientId)
      }

      console.log('Client ID resolved:', clientId)

      // Check if a quote with this quote number already exists
      const { data: existingQuote, error: checkError } = await supabase
        .from('quotes')
        .select('id')
        .eq('quote_number', dataToSave.quoteNumber)
        .single()

      let quoteId: string
      let revisionId: string

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means "no rows returned" - that's expected if no quote exists
        // Any other error should be logged and we'll fall back to creating a new quote
        console.error('Error checking for existing quote:', checkError)
      }

      if (existingQuote) {
        // Quote exists - check if we're saving changes to a loaded revision
        console.log('Quote with number', dataToSave.quoteNumber, 'already exists')
        quoteId = existingQuote.id

        if (currentLoadedRevisionId && currentLoadedQuoteId === quoteId) {
          // We're saving changes to a loaded revision - create a new revision
          console.log('Creating new revision for existing quote...')

          // Get the current highest revision number
          const { data: currentRevisions, error: revisionCheckError } = await supabase
            .from('quote_revisions')
            .select('revision_number')
            .eq('quote_id', quoteId)
            .order('revision_number', { ascending: false })
            .limit(1)

          if (revisionCheckError) {
            console.error('Error checking current revisions:', revisionCheckError)
            throw revisionCheckError
          }

          const nextRevisionNumber = currentRevisions && currentRevisions.length > 0
            ? Math.max(...currentRevisions.map(r => r.revision_number)) + 1
            : 1

          console.log('Creating new revision number:', nextRevisionNumber)

          // Create a new revision
          const { data: newRevision, error: revisionError } = await supabase
            .from('quote_revisions')
            .insert({
              quote_id: quoteId,
              revision_number: nextRevisionNumber,
              status: 'DRAFT',
              expires_on: dataToSave.expires,
              tax_rate: dataToSave.taxRate,
              is_tax_enabled: dataToSave.isTaxEnabled,
              notes: dataToSave.notes,
              is_recurring: dataToSave.isRecurring,
              billing_period: dataToSave.billingPeriod || null,
              recurring_amount: dataToSave.recurringAmount || null
            })
            .select()
            .single()

          if (revisionError) {
            console.error('Error creating new revision:', revisionError)
            throw revisionError
          }

          revisionId = newRevision.id
          console.log('Created new revision with ID:', revisionId)

          // Set success message for new revision creation
          setSaveMessage({ type: 'success', text: `New revision v${nextRevisionNumber} created successfully!` })

          // Clear the loaded revision tracking since we're now working with a new revision
          setCurrentLoadedRevisionId(null)
          setCurrentLoadedQuoteId(null)

          // Refresh the quote revisions list to show the new revision
          await loadQuoteRevisions(quoteId)

          // Update the form to show we're working with a new revision
          setFormData(prev => ({
            ...prev,
            quoteNumber: `${prev.quoteNumber}-v${nextRevisionNumber}`
          }))
        } else {
          // Regular update of existing quote - update the first revision
          console.log('Updating existing quote...')

          // Update the existing quote
          const { error: updateError } = await supabase
            .from('quotes')
            .update({
              client_id: clientId,
              status: 'DRAFT',
              updated_at: new Date().toISOString()
            })
            .eq('id', quoteId)

          if (updateError) {
            console.error('Error updating existing quote:', updateError)
            throw updateError
          }

          console.log('Updated existing quote with ID:', quoteId)

          // For existing quotes, we need to create a new revision number
          // Get the current highest revision number
          const { data: currentRevisions, error: revisionCheckError } = await supabase
            .from('quote_revisions')
            .select('revision_number')
            .eq('quote_id', quoteId)
            .order('revision_number', { ascending: false })
            .limit(1)

          if (revisionCheckError) {
            console.error('Error checking current revisions:', revisionCheckError)
            throw revisionCheckError
          }

          const nextRevisionNumber = currentRevisions && currentRevisions.length > 0
            ? Math.max(...currentRevisions.map(r => r.revision_number)) + 1
            : 1

          console.log('Next revision number for existing quote:', nextRevisionNumber)

          // Delete existing revision data to avoid conflicts
          await supabase.from('quote_items').delete().eq('quote_revision_id',
            (await supabase.from('quote_revisions').select('id').eq('quote_id', quoteId).eq('revision_number', 1).single()).data?.id
          )
          await supabase.from('payment_terms').delete().eq('quote_revision_id',
            (await supabase.from('quote_revisions').select('id').eq('quote_id', quoteId).eq('revision_number', 1).single()).data?.id
          )
          await supabase.from('legal_terms').delete().eq('quote_revision_id',
            (await supabase.from('quote_revisions').select('id').eq('quote_id', quoteId).eq('revision_number', 1).single()).data?.id
          )
          await supabase.from('client_comments').delete().eq('quote_revision_id',
            (await supabase.from('quote_revisions').select('id').eq('quote_id', quoteId).eq('revision_number', 1).single()).data?.id
          )

          // Update the existing revision instead of creating a new one
          const { error: revisionUpdateError } = await supabase
            .from('quote_revisions')
            .update({
              status: 'DRAFT',
              expires_on: dataToSave.expires,
              tax_rate: dataToSave.taxRate,
              is_tax_enabled: dataToSave.isTaxEnabled,
              notes: dataToSave.notes,
              is_recurring: dataToSave.isRecurring,
              billing_period: dataToSave.billingPeriod || null,
              recurring_amount: dataToSave.recurringAmount || null,
              updated_at: new Date().toISOString()
            })
            .eq('quote_id', quoteId)
            .eq('revision_number', 1)

          if (revisionUpdateError) {
            console.error('Error updating existing revision:', revisionUpdateError)
            throw revisionUpdateError
          }

          // Get the revision ID for the existing revision
          const { data: existingRevision, error: revisionGetError } = await supabase
            .from('quote_revisions')
            .select('id')
            .eq('quote_id', quoteId)
            .eq('revision_number', 1)
            .single()

          if (revisionGetError) {
            console.error('Error getting existing revision:', revisionGetError)
            throw revisionGetError
          }

          revisionId = existingRevision.id
          console.log('Using existing revision ID:', revisionId)

          // Refresh the quote revisions list to show any updates
          await loadQuoteRevisions(quoteId)
        }
      } else {
        // Quote doesn't exist - create a new one
        console.log('Creating new quote with number:', dataToSave.quoteNumber)

        const { data: quote, error } = await supabase
          .from('quotes')
          .insert({
            owner_id: '11111111-1111-1111-1111-111111111111', // Temporary placeholder - replace with actual auth.uid() when auth is implemented
            client_id: clientId,
            status: 'DRAFT',
            quote_number: dataToSave.quoteNumber
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating quote:', error)
          throw error
        }

        quoteId = quote.id
        console.log('Created new quote with ID:', quoteId)

        // Create the first revision of the quote
        console.log('Creating quote revision with data:', {
          quote_id: quoteId,
          revision_number: 1,
          status: 'DRAFT',
          expires_on: dataToSave.expires,
          tax_rate: dataToSave.taxRate,
          is_tax_enabled: dataToSave.isTaxEnabled,
          notes: dataToSave.notes,
          is_recurring: dataToSave.isRecurring,
          billing_period: dataToSave.billingPeriod || null,
          recurring_amount: dataToSave.recurringAmount || null
        })

        const { data: quoteRevision, error: revisionError } = await supabase
          .from('quote_revisions')
          .insert({
            quote_id: quoteId,
            revision_number: 1,
            status: 'DRAFT',
            expires_on: dataToSave.expires,
            tax_rate: dataToSave.taxRate,
            is_tax_enabled: dataToSave.isTaxEnabled,
            notes: dataToSave.notes,
            is_recurring: dataToSave.isRecurring,
            billing_period: dataToSave.billingPeriod || null,
            recurring_amount: dataToSave.recurringAmount || null
          })
          .select()
          .single()

        if (revisionError) {
          console.error('Error creating quote revision:', revisionError)
          throw revisionError
        }

        revisionId = quoteRevision.id

        // For new quotes, we need to refresh the client quotes list if we're currently viewing a client
        if (selectedClientQuote) {
          // Get the client ID from the current selected quote to refresh the client quotes
          const { data: currentQuote } = await supabase
            .from('quotes')
            .select('client_id')
            .eq('id', selectedClientQuote)
            .single()

          if (currentQuote?.client_id) {
            await loadClientQuotes(currentQuote.client_id)
          }
        }
      }

      // At this point, revisionId is set for both new and existing quotes
      console.log('About to insert items with revisionId:', revisionId)

      // Insert quote items for this revision
      const itemsPayload = dataToSave.items.map((i) => ({
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
      const paymentTermsPayload = dataToSave.paymentSchedule.map((p, idx) => ({
        quote_revision_id: revisionId,
        percentage: p.percentage,
        description: p.description,
        sort_order: idx
      }))

      const { error: paymentTermsError } = await supabase.from('payment_terms').insert(paymentTermsPayload)
      if (paymentTermsError) throw paymentTermsError

      // Insert legal terms for this revision
      if (dataToSave.legalTerms) {
        const { error: legalTermsError } = await supabase
          .from('legal_terms')
          .insert({
            quote_revision_id: revisionId,
            terms: dataToSave.legalTerms
          })
        if (legalTermsError) throw legalTermsError
      }

      // Insert client comments for this revision
      if (dataToSave.clientComments) {
        const { error: clientCommentsError } = await supabase
          .from('client_comments')
          .insert({
            quote_id: quoteId,
            quote_revision_id: revisionId,
            comment: dataToSave.clientComments
          })
        if (clientCommentsError) throw clientCommentsError
      }

      // Add new quote to history
      const newHistoryItem: QuoteHistory = {
        id: Date.now().toString(),
        quoteId: quoteId,
        quoteNumber: dataToSave.quoteNumber,
        versionNumber: 1,
        date: new Date().toLocaleDateString(),
        isCurrent: true,
        notes: '',
        clientName: dataToSave.clientName,
        status: 'DRAFT',
        version: 'v1'
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

      // Show title modal only if requested
      if (openTitleModalAfterSave) {
        openTitleModal(dataToSave, quoteId, revisionId)
      }

      // Reset change tracking since quote was saved
      setOriginalFormData(formData)
      setHasUnsavedChanges(false)

      return { quoteId, success: true }

    } catch (error) {
      console.error('Error saving quote:', error)

      // Provide more detailed error information
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase errors specifically
        if ('code' in error && 'message' in error) {
          errorMessage = `${error.code}: ${error.message}`
        } else if ('details' in error && typeof error.details === 'string') {
          errorMessage = error.details
        } else {
          errorMessage = JSON.stringify(error)
        }
      }

      console.error('Detailed error info:', {
        error,
        errorType: typeof error,
        errorMessage,
        formData: dataToSave
      })

      setSaveMessage({ type: 'error', text: `Error saving quote: ${errorMessage}` })
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  const loadClientQuotesByName = async (clientName: string) => {
    if (!clientName.trim()) {
      setClientQuotes([])
      setSelectedClientQuote('')
      return
    }

    try {
      // First, find the client by name
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('name', clientName)
        .single()

      if (clientError) {
        console.error('Error finding client:', clientError)
        setClientQuotes([])
        setSelectedClientQuote('')
        return
      }

      if (clients) {
        // Load quotes for this client
        await loadClientQuotes(clients.id)
      }
    } catch (error) {
      console.error('Error loading client quotes by name:', error)
      setClientQuotes([])
      setSelectedClientQuote('')
    }
  }

  const openViewQuoteModal = React.useCallback(async () => {
    setIsViewQuoteModalOpen(true)
    await loadAvailableClients()
  }, [])

  const closeViewQuoteModal = React.useCallback(() => {
    setIsViewQuoteModalOpen(false)
    // Don't clear selectedClientId and availableClients so company name stays visible
    // setSelectedClientId('')
    // setAvailableClients([])
  }, [])

  // Title modal functions
  const openTitleModal = React.useCallback((quoteData: QuoteFormData, quoteId: string, revisionId: string) => {
    setPendingQuoteData(quoteData)
    setPendingQuoteId(quoteId)
    setPendingRevisionId(revisionId)
    setIsTitleModalOpen(true)
  }, [])

  const closeTitleModal = React.useCallback(() => {
    setIsTitleModalOpen(false)
    setPendingQuoteData(null)
    setPendingQuoteId(null)
    setPendingRevisionId(null)
  }, [])

  const refreshCurrentView = React.useCallback(async () => {
    console.log('Refreshing current view...')

    try {
      // Refresh quote revisions if we have a selected quote
      if (selectedClientQuote) {
        console.log('Refreshing quote revisions for selected quote:', selectedClientQuote)

        // Force refresh by clearing state first
        console.log('Force refresh requested, clearing current revision ID')
        setCurrentLoadedRevisionId(null)
        setCurrentLoadedQuoteId(null)

        // Get the latest revisions directly from the database
        console.log('Force refresh completed, manually triggering auto-selection')
        const { data: latestRevisions } = await supabase
          .from('quote_revisions')
          .select('*')
          .eq('quote_id', selectedClientQuote)
          .eq('archived', false)
          .order('revision_number', { ascending: false })

        if (latestRevisions && latestRevisions.length > 0) {
          console.log('Setting quoteRevisions state with', latestRevisions.length, 'revisions')
          setQuoteRevisions(latestRevisions)

          const mostRecentRevision = latestRevisions[0]
          console.log('Manually loading most recent revision:', mostRecentRevision.id)

          // Load the revision data directly without calling loadQuoteRevision
          try {
            console.log('Loading quote revision:', mostRecentRevision.id)

            const { data: revision, error } = await supabase
              .from('quote_revisions')
              .select(`
                *,
                quotes!inner(
                  id,
                  quote_number,
                  clients(name, email)
                ),
                quote_items(*),
                payment_terms(*),
                legal_terms(*),
                client_comments(*)
              `)
              .eq('id', mostRecentRevision.id)
              .single()

            if (error) throw error

            if (revision) {
              console.log('Loaded quote revision:', revision)

              // Track which revision and quote are currently loaded
              setCurrentLoadedRevisionId(mostRecentRevision.id)
              setCurrentLoadedQuoteId(revision.quotes.id)

              // Update form data with the loaded revision
              const newFormData = {
                quoteNumber: revision.quotes.quote_number,
                clientName: revision.quotes.clients?.name || '',
                clientEmail: revision.quotes.clients?.email || '',
                expires: revision.expires_on || getDefaultExpirationDate(),
                taxRate: revision.tax_rate || 0.08,
                isTaxEnabled: revision.is_tax_enabled || false,
                title: revision.title || '',
                notes: revision.notes || '',
                isRecurring: revision.is_recurring || false,
                billingPeriod: revision.billing_period || '',
                recurringAmount: revision.recurring_amount || 0,
                items: revision.quote_items?.map((item: DatabaseQuoteItem) => ({
                  id: item.id,
                  description: item.description || '',
                  quantity: item.quantity || 1,
                  unitPrice: item.unit_price || 0,
                  total: item.total || 0
                })) || [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
                paymentSchedule: revision.payment_terms?.map((term: DatabasePaymentTerm) => ({
                  id: term.id,
                  percentage: term.percentage || 100,
                  description: term.description || ''
                })) || [{ id: 'ps-1', percentage: 100, description: 'net 30 days' }],
                legalTerms: revision.legal_terms?.[0]?.terms || '',
                clientComments: revision.client_comments?.[0]?.comment || '',
                sentViaEmail: revision.sent_via_email || false
              }

              // Recalculate totals
              const items = newFormData.items
              const { subtotal, tax, total } = recalc(items, newFormData.isTaxEnabled, newFormData.taxRate)

              console.log('Updating form data with new revision data')
              // Update form data in one batch
              setFormData(prev => ({
                ...prev,
                ...newFormData,
                subtotal,
                tax,
                total
              }))

              // Set the original form data to track changes
              const finalFormData = {
                ...formData,
                ...newFormData,
                subtotal,
                tax,
                total
              }
              setOriginalFormData(finalFormData)
              setHasUnsavedChanges(false)
            }
          } catch (error) {
            console.error('Error loading quote revision:', error)
          }
        }
      }

      // Refresh client quotes if we have a selected client
      if (selectedClientId) {
        console.log('Refreshing client quotes for selected client:', selectedClientId)
        await loadClientQuotes(selectedClientId)
      }

      // Also refresh client quotes if we have a selected client quote but no selected client
      if (selectedClientQuote && !selectedClientId) {
        console.log('Getting client ID from selected quote to refresh client quotes')
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('client_id')
          .eq('id', selectedClientQuote)
          .single()

        if (quoteData?.client_id) {
          console.log('Refreshing client quotes for client:', quoteData.client_id)
          await loadClientQuotes(quoteData.client_id)
        }
      }

      console.log('Current view refresh completed')
    } catch (error) {
      console.error('Error refreshing current view:', error)
    }
  }, [selectedClientQuote, selectedClientId, loadClientQuotes, recalc])

  const submitTitleAndCompleteSave = React.useCallback(async (title: string) => {
    if (!pendingQuoteData || !pendingQuoteId || !pendingRevisionId) {
      console.error('Missing pending data for title submission')
      return
    }

    try {
      console.log('Updating revision with title:', title)

      // Update the revision with the title
      const { error: updateError } = await supabase
        .from('quote_revisions')
        .update({ title: title })
        .eq('id', pendingRevisionId)

      if (updateError) throw updateError

      console.log('Revision updated successfully, closing modal')
      // Close the modal
      closeTitleModal()

      // Set success message
      setSaveMessage({ type: 'success', text: 'Quote saved successfully!' })

      // Refresh the current view to show updated data
      await refreshCurrentView()

      console.log('All refresh operations completed')

    } catch (error) {
      console.error('Error updating revision with title:', error)
      setSaveMessage({ type: 'error', text: `Error saving title: ${error instanceof Error ? error.message : 'Unknown error'}` })
    }
  }, [pendingQuoteData, pendingQuoteId, pendingRevisionId, refreshCurrentView])

  const loadAvailableClients = async () => {
    setIsLoadingAvailableClients(true)
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .order('name', { ascending: true })

      if (error) throw error

      if (clients && clients.length > 0) {
        console.log('Loaded available clients:', clients)
        setAvailableClients(clients)
      } else {
        setAvailableClients([])
      }
    } catch (error) {
      console.error('Error loading available clients:', error)
      setSaveMessage({ type: 'error', text: `Error loading clients: ${error instanceof Error ? error.message : 'Unknown error'}` })
      setAvailableClients([])
    } finally {
      setIsLoadingAvailableClients(false)
    }
  }

  const handleClientSelection = React.useCallback(async (clientId: string) => {
    setSelectedClientId(clientId)

    // Find the selected client to get their information
    const selectedClient = availableClients.find(client => client.id === clientId)

    if (selectedClient) {
      // Populate the form fields with the selected client's information
      setFormData(prev => ({
        ...prev,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        // Note: Owner field is not available in client data, so it remains unchanged
      }))
    }

    // Load quotes for this client
    await loadClientQuotes(clientId)

    // If there are existing quotes, load the most recent one to get additional context
    if (clientQuotes.length > 0) {
      await loadQuote(clientQuotes[0].id)
    }

    closeViewQuoteModal()
  }, [availableClients])

    const loadQuoteRevisions = React.useCallback(async (quoteId: string, forceRefresh: boolean = false) => {
    console.log('=== LOAD_QUOTE_REVISIONS CALLED ===')
    console.log('loadQuoteRevisions called with quoteId:', quoteId, 'forceRefresh:', forceRefresh)

    if (!quoteId) {
      console.log('❌ No quoteId provided, clearing revisions')
      setQuoteRevisions([])
      return
    }

    // Prevent loading revisions for the same quote multiple times, UNLESS forceRefresh is true
    if (!forceRefresh && currentLoadedQuoteId === quoteId && quoteRevisions.length > 0) {
      console.log('⚠️ Revisions already loaded for quote, skipping:', quoteId)
      return
    }

    // If forcing refresh, clear the current revision ID so auto-selection can work
    if (forceRefresh) {
      console.log('🔄 Force refresh requested, clearing current revision ID')
      setCurrentLoadedRevisionId(null)
      // Also clear the current loaded quote ID to ensure fresh data
      setCurrentLoadedQuoteId(null)
    }

    console.log('📥 Loading quote revisions for quote:', quoteId)
    setIsLoadingQuoteRevisions(true)
    try {
      // First, get the current quote status from status history
      const { data: statusData, error: statusError } = await supabase
        .from('quote_status_history')
        .select('status')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (statusError) {
        console.warn('⚠️ Failed to load quote status:', statusError)
      }

      const currentQuoteStatus = statusData && statusData.length > 0 ? statusData[0].status : 'DRAFT'

      // Then get the revisions
      const { data: revisions, error } = await supabase
        .from('quote_revisions')
        .select('*, sent_via_email, sent_at')
        .eq('quote_id', quoteId)
        .eq('archived', false)
        .order('revision_number', { ascending: false })

      if (error) throw error

      if (revisions && revisions.length > 0) {
        // Add the current quote status to each revision for display purposes
        const revisionsWithStatus = revisions.map(revision => ({
          ...revision,
          currentQuoteStatus: currentQuoteStatus
        }))

        console.log('✅ Loaded quote revisions for quote ID:', quoteId, revisionsWithStatus)
        console.log('📝 Setting quoteRevisions state with', revisionsWithStatus.length, 'revisions')
        console.log('🔍 Revision details:', revisionsWithStatus.map(r => ({
          id: r.id,
          revision_number: r.revision_number,
          status: r.status,
          sent_via_email: r.sent_via_email,
          currentQuoteStatus: r.currentQuoteStatus
        })))
        setQuoteRevisions(revisionsWithStatus)
        console.log('✅ State update triggered for quoteRevisions')
      } else {
        console.log('❌ No revisions found for quote:', quoteId)
        setQuoteRevisions([])
      }
    } catch (error) {
      console.error('❌ Error loading quote revisions:', error)
      setQuoteRevisions([])
    } finally {
      setIsLoadingQuoteRevisions(false)
      console.log('🏁 Finished loading quote revisions for quote:', quoteId)
    }
  }, [currentLoadedQuoteId, quoteRevisions.length, setCurrentLoadedRevisionId, setQuoteRevisions, setIsLoadingQuoteRevisions])

    const archiveQuoteRevision = React.useCallback(async (revisionId: string) => {
    try {
      console.log('Starting archive process for revision:', revisionId)

      // Find the revision to archive
      const revisionToArchive = quoteRevisions.find(r => r.id === revisionId)
      if (!revisionToArchive) {
        console.error('Revision not found:', revisionId)
        return
      }

      console.log('Revision to archive:', revisionToArchive)

      // Check if this is the CURRENT revision (first in the list)
      const isCurrentRevision = quoteRevisions.indexOf(revisionToArchive) === 0
      console.log('Is current revision:', isCurrentRevision)

      // Archive the revision in the database
      const { error: archiveError } = await supabase
        .from('quote_revisions')
        .update({ archived: true })
        .eq('id', revisionId)

      if (archiveError) throw archiveError

      // Check if this was the last remaining revision for this quote
      const remainingRevisions = quoteRevisions.filter(r => r.id !== revisionId)
      if (remainingRevisions.length === 0) {
        // This was the last revision - archive the base quote
        console.log('Last revision archived - archiving base quote:', revisionToArchive.quote_id)

        const { error: quoteArchiveError } = await supabase
          .from('quotes')
          .update({ archived: true })
          .eq('id', revisionToArchive.quote_id)

        if (quoteArchiveError) {
          console.error('Error archiving base quote:', quoteArchiveError)
          // Don't throw here - the revision was archived successfully
        } else {
          console.log('Base quote archived successfully')

          // Remove the archived quote from the client quotes list
          setClientQuotes(prev => prev.filter(quote => quote.id !== revisionToArchive.quote_id))

          // If this was the currently selected quote, clear the selection
          if (selectedClientQuote === revisionToArchive.quote_id) {
            setSelectedClientQuote('')
            setQuoteRevisions([])
          }
        }
      } else {
        // If this was the CURRENT revision, we don't need to update any database fields
        // The "CURRENT" status is just a UI concept - the first non-archived revision will be shown as current
        if (isCurrentRevision) {
          console.log('Archived CURRENT revision - UI will automatically show next revision as current')
        }

        // Refresh the revisions list to show the updated state
        if (currentLoadedQuoteId) {
          await loadQuoteRevisions(currentLoadedQuoteId)
        }
      }

      setSaveMessage({
        type: 'success',
        text: 'Revision archived successfully'
      })

    } catch (error) {
      console.error('Error archiving revision:', error)
      setSaveMessage({
        type: 'error',
        text: `Error archiving revision: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }, [quoteRevisions, currentLoadedQuoteId, loadQuoteRevisions])

  const loadQuoteRevision = React.useCallback(async (revisionId: string) => {
    console.log('loadQuoteRevision called with revisionId:', revisionId, 'currentLoadedRevisionId:', currentLoadedRevisionId)

    if (!revisionId) {
      console.log('No revisionId provided')
      return
    }

    // Prevent loading the same revision multiple times
    if (currentLoadedRevisionId === revisionId) {
      console.log('Revision already loaded, skipping:', revisionId)
      return
    }

    // Add a small delay to prevent rapid successive calls
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      console.log('Loading quote revision:', revisionId)

      // Load the specific revision with all its related data
      const { data: revision, error } = await supabase
        .from('quote_revisions')
        .select(`
          *,
          quotes!inner(
            id,
            quote_number,
            clients(name, email)
          ),
          quote_items(*),
          payment_terms(*),
          legal_terms(*),
          client_comments(*)
        `)
        .eq('id', revisionId)
        .single()

      if (error) throw error

      if (revision) {
        console.log('Loaded quote revision:', revision)

        // Double-check that we haven't loaded this revision while waiting
        if (currentLoadedRevisionId === revisionId) {
          console.log('Revision was loaded while waiting, skipping update')
          return
        }

        // Track which revision and quote are currently loaded
        console.log('Setting currentLoadedRevisionId to:', revisionId)
        setCurrentLoadedRevisionId(revisionId)
        console.log('Setting currentLoadedQuoteId to:', revision.quotes.id)
        setCurrentLoadedQuoteId(revision.quotes.id)

        // Batch form data updates to prevent multiple re-renders
        const newFormData = {
          quoteNumber: revision.quotes.quote_number,
          clientName: revision.quotes.clients?.name || '',
          clientEmail: revision.quotes.clients?.email || '',
          expires: revision.expires_on || getDefaultExpirationDate(),
          taxRate: revision.tax_rate || 0.08,
          isTaxEnabled: revision.is_tax_enabled || false,
          title: revision.title || '',
          notes: revision.notes || '',
          isRecurring: revision.is_recurring || false,
          billingPeriod: revision.billing_period || '',
          recurringAmount: revision.recurring_amount || 0,
          items: revision.quote_items?.map((item: DatabaseQuoteItem) => ({
            id: item.id,
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unit_price || 0,
            total: item.total || 0
          })) || [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
          paymentSchedule: revision.payment_terms?.map((term: DatabasePaymentTerm) => ({
            id: term.id,
            percentage: term.percentage || 100,
            description: term.description || ''
          })) || [{ id: 'ps-1', percentage: 100, description: 'net 30 days' }],
          legalTerms: revision.legal_terms?.[0]?.terms || '',
          clientComments: revision.client_comments?.[0]?.comment || '',
          sentViaEmail: revision.sent_via_email || false
        }

        // Recalculate totals
        const items = newFormData.items
        const { subtotal, tax, total } = recalc(items, newFormData.isTaxEnabled, newFormData.taxRate)

        console.log('Updating form data with new revision data')
        // Update form data in one batch
        setFormData(prev => ({
          ...prev,
          ...newFormData,
          subtotal,
          tax,
          total
        }))

        // Set the original form data to track changes
        const finalFormData = {
          ...formData,
          ...newFormData,
          subtotal,
          tax,
          total
        }
        setOriginalFormData(finalFormData)
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error loading quote revision:', error)
      setSaveMessage({ type: 'error', text: `Error loading quote revision: ${error instanceof Error ? error.message : 'Unknown error'}` })
    }
  }, [currentLoadedRevisionId])

  const saveQuoteForEmail = async (quoteData?: QuoteFormData) => {
    const dataToSave = quoteData || formData
    console.log('💾 saveQuoteForEmail called with data:', dataToSave)

    try {
      // Validate required fields
      if (!dataToSave.quoteNumber?.trim()) {
        throw new Error('Quote number is required')
      }
      if (!dataToSave.clientName?.trim()) {
        throw new Error('Client name is required')
      }
      if (!dataToSave.items || dataToSave.items.length === 0) {
        throw new Error('At least one quote item is required')
      }

      // First, create or get the client
      let clientId = null
      console.log('About to process client creation in saveQuoteForEmail...')
      console.log('Client name from dataToSave:', dataToSave.clientName)
      console.log('Client email from dataToSave:', dataToSave.clientEmail)
      console.log('Client email type:', typeof dataToSave.clientEmail)
      console.log('Client email length:', dataToSave.clientEmail?.length)
      console.log('Client email trimmed:', dataToSave.clientEmail?.trim())
      console.log('Will create client:', !!(dataToSave.clientName || dataToSave.clientEmail))

      if (dataToSave.clientName || dataToSave.clientEmail) {
        console.log('Processing client:', { name: dataToSave.clientName, email: dataToSave.clientEmail })

        // Try to find existing client by name first (SAVEQUOTEFOREMAIL FUNCTION)
        const { data: existingClients, error: searchError } = await supabase
          .from('clients')
          .select('id')
          .eq('name', dataToSave.clientName)

        if (searchError) {
          console.error('Error searching for existing client:', searchError)
          throw searchError
        }

        if (existingClients && existingClients.length > 0) {
          clientId = existingClients[0].id
          console.log('Found existing client with ID:', clientId)

          // Check if the client's email has changed and update it
          const { data: currentClient, error: clientFetchError } = await supabase
            .from('clients')
            .select('email')
            .eq('id', clientId)
            .single()

          if (clientFetchError) {
            console.error('Error fetching current client data:', clientFetchError)
          } else {
            console.log('🔍 DEBUG: Checking if client email needs update...')
            console.log('🔍 Current client email in DB:', currentClient?.email)
            console.log('🔍 New email from form:', dataToSave.clientEmail)
            console.log('🔍 Trimmed new email:', dataToSave.clientEmail?.trim())
            console.log('🔍 Emails are different?', currentClient?.email !== dataToSave.clientEmail?.trim())
            console.log('🔍 New email is empty?', dataToSave.clientEmail?.trim() === '')
            console.log('🔍 New email is valid?', dataToSave.clientEmail?.trim() ? isValidEmail(dataToSave.clientEmail.trim()) : 'N/A')

            // Test if we can actually update this client record
            console.log('🧪 Testing database permissions...')
            const testUpdate = await supabase
              .from('clients')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', clientId)
              .select('id, updated_at')

            if (testUpdate.error) {
              console.error('❌ Database permission test failed:', testUpdate.error)
              console.error('❌ This suggests an RLS policy or permission issue')
            } else {
              console.log('✅ Database permission test passed, can update client records')
            }

            if (currentClient &&
                dataToSave.clientEmail?.trim() !== currentClient.email &&
                (dataToSave.clientEmail?.trim() === '' || isValidEmail(dataToSave.clientEmail.trim()))) {
              console.log('✅ Client email has changed, updating client record...')
              console.log('📧 Old email:', currentClient.email)
              console.log('📧 New email:', dataToSave.clientEmail?.trim() || '(empty)')

              const { error: updateError } = await supabase
                .from('clients')
                .update({ email: dataToSave.clientEmail?.trim() || '' })
                .eq('id', clientId)

              if (updateError) {
                console.error('❌ Error updating client email:', updateError)
              } else {
                console.log('✅ Successfully updated client email in database')

                // Verify the update actually worked by fetching the client again
                const { data: verifyClient, error: verifyError } = await supabase
                  .from('clients')
                  .select('email')
                  .eq('id', clientId)
                  .single()

                if (verifyError) {
                  console.error('❌ Error verifying client update:', verifyError)
                } else {
                  console.log('🔍 Verification - Client email in DB after update:', verifyClient?.email)
                  console.log('🔍 Verification - Expected email:', dataToSave.clientEmail?.trim() || '(empty)')
                  console.log('🔍 Verification - Update successful?', verifyClient?.email === (dataToSave.clientEmail?.trim() || ''))
                }

                // Show a brief success message for email update
                const newEmail = dataToSave.clientEmail?.trim() || '(empty)'
                setSaveMessage({ type: 'success', text: `Client email updated to ${newEmail}` })
              }
            } else {
              console.log('ℹ️ No email update needed or email validation failed')
              if (currentClient && dataToSave.clientEmail?.trim() === currentClient.email) {
                console.log('ℹ️ Emails are identical, no update needed')
              } else if (dataToSave.clientEmail?.trim() && !isValidEmail(dataToSave.clientEmail.trim())) {
                console.log('⚠️ New email format is invalid, skipping update')
              }
            }
          }
        } else {
          console.log('Creating new client...')
          // Create new client - ensure we have a valid email (SAVEQUOTEFOREMAIL FUNCTION)
          console.log('Raw client email before trim:', dataToSave.clientEmail)
          console.log('Client email after trim:', dataToSave.clientEmail?.trim())
          console.log('Fallback email:', `${dataToSave.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`)

          // Better email validation - check if email is actually provided and valid
          const providedEmail = dataToSave.clientEmail?.trim()
          const clientEmail = providedEmail && providedEmail.length > 0 && isValidEmail(providedEmail)
            ? providedEmail
            : `${dataToSave.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`

          if (clientEmail !== providedEmail) {
            console.log('⚠️ Using fallback email because provided email was invalid or empty')
            console.log('Provided email:', JSON.stringify(providedEmail))
            console.log('Fallback email:', clientEmail)
          }

          console.log('Final client email to use:', clientEmail)
          console.log('Creating client with email:', clientEmail, 'from form data:', dataToSave.clientEmail)

          const { data: newClient, error: createError } = await supabase
            .from('clients')
            .insert({
              name: dataToSave.clientName || 'Unknown Client',
              email: clientEmail
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating new client:', createError)
            throw createError
          }
          clientId = newClient.id
          console.log('Created new client with ID:', clientId)
        }
      }

      // Ensure we have a client ID - create a default client if none exists
      if (!clientId) {
        console.log('No client specified, creating default client...')
        const { data: defaultClient, error: defaultClientError } = await supabase
          .from('clients')
          .insert({
            name: 'Default Client',
            email: 'default@example.com'
          })
          .select()
          .single()

        if (defaultClientError) {
          console.error('Error creating default client:', defaultClientError)
          throw defaultClientError
        }
        clientId = defaultClient.id
        console.log('Created default client with ID:', clientId)
      }

      console.log('Client ID resolved:', clientId)

      // Check if a quote with this quote number already exists
      const { data: existingQuote, error: checkError } = await supabase
        .from('quotes')
        .select('id')
        .eq('quote_number', dataToSave.quoteNumber)
        .single()

      let quoteId: string
      let revisionId: string

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means "no rows returned" - that's expected if no quote exists
        // Any other error should be logged and we'll fall back to creating a new quote
        console.error('Error checking for existing quote:', checkError)
      }

      if (existingQuote) {
        // Update existing quote
        quoteId = existingQuote.id
        console.log('Updating existing quote with ID:', quoteId)

        // Update the quote (without expires_on since it's not in the quotes table)
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            client_id: clientId,
            quote_number: dataToSave.quoteNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId)

        if (updateError) throw updateError

        // Get the most recent revision for this quote
        const { data: revisions, error: revisionsError } = await supabase
          .from('quote_revisions')
          .select('id')
          .eq('quote_id', quoteId)
          .order('revision_number', { ascending: false })
          .limit(1)
          .single()

        if (revisionsError) {
          console.error('Error getting revisions:', revisionsError)
          throw revisionsError
        }

        revisionId = revisions.id
        console.log('Using existing revision with ID:', revisionId)

        // Update the revision (including expires_on here)
        const { error: revisionUpdateError } = await supabase
          .from('quote_revisions')
          .update({
            expires_on: dataToSave.expires,
            tax_rate: dataToSave.taxRate,
            is_tax_enabled: dataToSave.isTaxEnabled,
            is_recurring: dataToSave.isRecurring,
            billing_period: dataToSave.billingPeriod && ['monthly', 'quarterly', 'yearly', 'one-time'].includes(dataToSave.billingPeriod)
              ? dataToSave.billingPeriod
              : null,
            recurring_amount: dataToSave.recurringAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', revisionId)

        if (revisionUpdateError) throw revisionUpdateError

      } else {
        // Create new quote
        console.log('Creating new quote...')
        const { data: newQuote, error: createError } = await supabase
          .from('quotes')
          .insert({
            client_id: clientId,
            quote_number: dataToSave.quoteNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating new quote:', createError)
          throw createError
        }

        quoteId = newQuote.id
        console.log('Created new quote with ID:', quoteId)

        // Create new revision (including expires_on here)
        console.log('Creating new revision...')
        const { data: newRevision, error: revisionError } = await supabase
          .from('quote_revisions')
          .insert({
            quote_id: quoteId,
            revision_number: 1,
            expires_on: dataToSave.expires,
            tax_rate: dataToSave.taxRate,
            is_tax_enabled: dataToSave.isTaxEnabled,
            is_recurring: dataToSave.isRecurring,
            billing_period: dataToSave.billingPeriod && ['monthly', 'quarterly', 'yearly', 'one-time'].includes(dataToSave.billingPeriod)
              ? dataToSave.billingPeriod
              : null,
            recurring_amount: dataToSave.recurringAmount,
            notes: 'Quote created for email sending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (revisionError) {
          console.error('Error creating new revision:', revisionError)
          throw revisionError
        }

        revisionId = newRevision.id
        console.log('Created new revision with ID:', revisionId)
      }

      // Save quote items
      console.log('Saving quote items...')
      try {
        // First, delete any existing items for this revision to prevent duplication
        const { error: deleteItemsError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_revision_id', revisionId)

        if (deleteItemsError) {
          console.error('Error deleting existing quote items:', deleteItemsError)
          throw deleteItemsError
        }

        // Then insert new items
        if (dataToSave.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(
              dataToSave.items.map(item => ({
                quote_revision_id: revisionId,
                description: item.description || 'No description',
                quantity: item.quantity || 1,
                unit_price: item.unitPrice || 0,
                total: item.total || 0,
                sort_order: 0
              }))
            )

          if (itemsError) {
            console.error('Error inserting quote items:', itemsError)
            throw itemsError
          }
        }
      } catch (error) {
        console.error('Error in quote items operation:', error)
        throw error
      }

      // Save payment terms
      console.log('Saving payment terms...')
      try {
        // First, delete any existing payment terms for this revision to prevent duplication
        const { error: deletePaymentTermsError } = await supabase
          .from('payment_terms')
          .delete()
          .eq('quote_revision_id', revisionId)

        if (deletePaymentTermsError) {
          console.error('Error deleting existing payment terms:', deletePaymentTermsError)
          throw deletePaymentTermsError
        }

        // Then insert new payment terms
        if (dataToSave.paymentSchedule.length > 0) {
          const { error: paymentTermsError } = await supabase
            .from('payment_terms')
            .insert(
              dataToSave.paymentSchedule.map(term => ({
                quote_revision_id: revisionId,
                percentage: term.percentage || 100,
                description: term.description || 'Payment term',
                sort_order: 0
              }))
            )

          if (paymentTermsError) {
            console.error('Error inserting payment terms:', paymentTermsError)
            throw paymentTermsError
          }
        }
      } catch (error) {
        console.error('Error in payment terms operation:', error)
        throw error
      }

      // Save notes
      if (dataToSave.notes) {
        console.log('Saving notes...')
        try {
          // Notes are stored directly in quote_revisions table, not in a separate quote_notes table
          const { error: notesError } = await supabase
            .from('quote_revisions')
            .update({
              notes: dataToSave.notes
            })
            .eq('id', revisionId)

          if (notesError) {
            console.error('Error updating notes in quote_revisions:', notesError)
            throw notesError
          }
        } catch (error) {
          console.error('Error in notes operation:', error)
          throw error
        }
      }

      // Save legal terms
      if (dataToSave.legalTerms) {
        console.log('Saving legal terms...')
        try {
          // Use upsert with the correct column name
          const { error: legalTermsError } = await supabase
            .from('legal_terms') // Fixed: was quote_legal_terms
            .insert({
              quote_revision_id: revisionId, // Fixed: was revision_id
              terms: dataToSave.legalTerms
            })

          if (legalTermsError) {
            console.error('Error inserting legal terms:', legalTermsError)
            throw legalTermsError
          }
        } catch (error) {
          console.error('Error in legal terms operation:', error)
          throw error
        }
      }

      // Save client comments
      if (dataToSave.clientComments) {
        console.log('Saving client comments...')
        try {
          // Use upsert with the correct column name
          const { error: clientCommentsError } = await supabase
            .from('client_comments') // Fixed: was quote_client_comments
            .insert({
              quote_id: quoteId, // This table has both quote_id and quote_revision_id
              quote_revision_id: revisionId, // Fixed: was revision_id
              comment: dataToSave.clientComments
            })

          if (clientCommentsError) {
            console.error('Error inserting client comments:', clientCommentsError)
            throw clientCommentsError
          }
        } catch (error) {
          console.error('Error in client comments operation:', error)
          throw error
        }
      }

      console.log('✅ Quote saved successfully for email sending')
      return { quoteId, success: true }

    } catch (error) {
      console.error('❌ Error saving quote for email:', error)
      throw error
    }
  }

  const sendQuoteToClient = async () => {
    console.log('🚀 sendQuoteToClient called')
    console.log('Current form data:', formData)

    if (!formData.clientEmail) {
      console.log('❌ No client email found')
      setSaveMessage({ type: 'error', text: 'Client email is required to send quote' })
      return
    }

    if (!formData.quoteNumber) {
      console.log('❌ No quote number found')
      setSaveMessage({ type: 'error', text: 'Quote number is required to send quote' })
      return
    }

    console.log('✅ Validation passed, starting email process...')
    setIsSaving(true)
    try {
      // First, ensure the quote is saved using the email-specific save function
      console.log('💾 Saving quote before sending (using saveQuoteForEmail)...')
      const savedQuote = await saveQuoteForEmail()
      console.log('💾 Save result:', savedQuote)

      if (!savedQuote) {
        throw new Error('Failed to save quote before sending')
      }

      // Send email using EmailService
      console.log('📧 Calling EmailService...')
      const emailService = EmailService.getInstance()
      await emailService.sendQuoteEmail({
        quoteId: savedQuote.quoteId,
        clientEmail: formData.clientEmail,
        clientName: formData.clientName,
        quoteNumber: formData.quoteNumber,
        quoteUrl: formData.quoteUrl,
        total: formData.total,
        expires: formData.expires
      })

      console.log('📧 Email sent successfully, updating revision status...')
      // Note: quote_status_history is only used for future audit features, not for display

      // Mark the current revision as sent via email
      if (currentLoadedRevisionId) {
        const { error: revisionUpdateError } = await supabase
          .from('quote_revisions')
          .update({
            sent_via_email: true,
            sent_at: new Date().toISOString()
          })
          .eq('id', currentLoadedRevisionId)

        if (revisionUpdateError) {
          console.warn('⚠️ Failed to update revision sent status:', revisionUpdateError)
        } else {
          console.log('✅ Marked revision as sent via email:', currentLoadedRevisionId)

          // Update the form data to reflect that this revision has been sent
          setFormData(prev => ({
            ...prev,
            sentViaEmail: true
          }))

          // Reset change tracking since the quote was just sent
          setOriginalFormData(prev => prev ? { ...prev, sentViaEmail: true } : null)
          setHasUnsavedChanges(false)
        }
      }

      console.log('✅ Setting success message...')
      setSaveMessage({ type: 'success', text: 'Quote sent to client successfully!' })

      // Refresh the client quotes to show the updated status
      if (selectedClientId) {
        console.log('🔄 Refreshing client quotes to show updated status...')
        await loadClientQuotes(selectedClientId)
      }

      // Also refresh the quote revisions to show the updated status
      if (currentLoadedQuoteId === savedQuote.quoteId) {
        console.log('🔄 Refreshing quote revisions to show updated status...')
        await loadQuoteRevisions(savedQuote.quoteId, true)
      }

    } catch (error) {
      console.error('❌ Error sending quote to client:', error)
      setSaveMessage({ type: 'error', text: `Failed to send quote: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      console.log('🏁 Setting isSaving to false')
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
    saveQuoteForEmail,
    sendQuoteToClient,
    isSaving,
    saveMessage,
    isLoadingHistory,
    loadQuoteHistory,
    loadNextQuoteNumber,
    loadQuote,
    // New Quote Modal
    isNewQuoteModalOpen,
    newQuoteData,
    openNewQuoteModal,
    closeNewQuoteModal,
    createNewQuote,
    setNewQuoteData,
    updateNewQuoteData,
    clientSuggestions,
    setClientSuggestions,
    isLoadingClients,
    searchClients,
    isCreatingQuote,
    // View Quote Modal
    isViewQuoteModalOpen,
    openViewQuoteModal,
    closeViewQuoteModal,
    availableClients,
    isLoadingAvailableClients,
    loadAvailableClients,
    selectedClientId,
    setSelectedClientId,
    clientQuotes,
    isLoadingClientQuotes,
    selectedClientQuote,
    setSelectedClientQuote,
    loadClientQuotes,
    handleClientSelection,
    loadClientQuotesByName,
    // Quote Revisions
    quoteRevisions,
    isLoadingQuoteRevisions,
    loadQuoteRevisions,
    loadQuoteRevision,
    archiveQuoteRevision,
    // Revision state tracking
    currentLoadedRevisionId,
    currentLoadedQuoteId,
    // Utility functions
    clearLoadedRevisionState,
    resetForm,
    // Title Modal
    isTitleModalOpen,
    openTitleModal,
    closeTitleModal,
    submitTitleAndCompleteSave,
    refreshCurrentView,
    // Change tracking
    hasUnsavedChanges,
  }
}
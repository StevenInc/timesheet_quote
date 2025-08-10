import { useMemo, useState, useEffect } from 'react'
import type { QuoteFormData, QuoteItem, PaymentTermItem, NewQuoteModalData, QuoteHistory, DatabaseQuote, DatabaseQuoteRevision, DatabaseQuoteItem, DatabasePaymentTerm, ClientQuote, DatabaseClient } from './types'
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

  // Client Quotes State
  const [clientQuotes, setClientQuotes] = useState<ClientQuote[]>([])
  const [isLoadingClientQuotes, setIsLoadingClientQuotes] = useState(false)
  const [selectedClientQuote, setSelectedClientQuote] = useState<string>('')

  // New Quote Modal State
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false)
  const [newQuoteData, setNewQuoteData] = useState<NewQuoteModalData>({
    quoteNumber: '',
    clientName: ''
  })
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)

  // View Quote Modal State
  const [isViewQuoteModalOpen, setIsViewQuoteModalOpen] = useState(false)
  const [availableClients, setAvailableClients] = useState<DatabaseClient[]>([])
  const [isLoadingAvailableClients, setIsLoadingAvailableClients] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Load next quote number when component mounts
  useEffect(() => {
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

      setNewQuoteData(prev => ({
        ...prev,
        quoteNumber: nextQuoteNumber
      }))

      console.log('Next available quote number:', nextQuoteNumber)
    } catch (error) {
      console.error('Error loading next quote number:', error)
      // Set default quote number on error
      const defaultNumber = '1000'
      setFormData(prev => ({
        ...prev,
        quoteNumber: defaultNumber
      }))
      setNewQuoteData(prev => ({
        ...prev,
        quoteNumber: defaultNumber
      }))
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
            expires: latestRevision.expires_on || '2025-07-08',
            taxRate: latestRevision.tax_rate || 0.08,
            isTaxEnabled: latestRevision.is_tax_enabled || false,
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

  const loadClientQuotes = async (clientId: string) => {
    setIsLoadingClientQuotes(true)
    try {
      // Get all quotes for the specified client
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          status,
          created_at,
          updated_at,
          quote_revisions(id, revision_number)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (quotes && quotes.length > 0) {
        console.log('Loaded client quotes for client ID:', clientId, quotes)

        const clientQuoteItems = quotes.map((quote) => {
          const revisions = quote.quote_revisions || []
          const latestRevision = Math.max(...revisions.map(r => r.revision_number), 0)

          return {
            id: quote.id,
            quoteNumber: quote.quote_number,
            status: quote.status,
            createdAt: new Date(quote.created_at).toLocaleDateString(),
            updatedAt: new Date(quote.updated_at).toLocaleDateString(),
            latestRevisionNumber: latestRevision,
            totalRevisions: revisions.length
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
  }

  // New Quote Modal Functions
  const openNewQuoteModal = async () => {
    // Always get a fresh, unique quote number when opening the modal
    await loadNextQuoteNumber()
    setIsNewQuoteModalOpen(true)
  }

  const closeNewQuoteModal = () => {
    setIsNewQuoteModalOpen(false)
    setNewQuoteData({ quoteNumber: '', clientName: '' })
    setClientSuggestions([])
  }

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
    setNewQuoteData(prev => ({ ...prev, [field]: value }))
  }

  const createNewQuote = async () => {
    if (newQuoteData.quoteNumber.trim()) {
      setIsCreatingQuote(true)

      try {
        // First, check if a client with this name already exists in the database
        let clientEmail = `${newQuoteData.clientName.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`

        if (newQuoteData.clientName.trim()) {
          const { data: existingClient, error: clientError } = await supabase
            .from('clients')
            .select('email')
            .eq('name', newQuoteData.clientName.trim())
            .single()

          if (!clientError && existingClient && existingClient.email) {
            // Use the actual email from the database
            clientEmail = existingClient.email
            console.log('Found existing client email:', clientEmail)
          } else {
            console.log('No existing client found, using generated email:', clientEmail)
          }
        }

        // Create a temporary form data object for the new quote
        const newQuoteFormData: QuoteFormData = {
          owner: '',
          clientName: newQuoteData.clientName.trim(),
          clientEmail: clientEmail,
          quoteNumber: newQuoteData.quoteNumber.trim(),
          quoteUrl: `https://quotes.timesheets.com/${newQuoteData.quoteNumber.trim()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
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
          legalTerms: `TERMS AND CONDITIONS

1. PAYMENT TERMS
   Payment is due within 30 days of invoice date. Late payments may incur additional charges.

2. SCOPE OF WORK
   All work will be performed according to the specifications outlined in this quote.

3. CHANGES AND REVISIONS
   Any changes to the scope of work must be agreed upon in writing and may affect pricing and timeline.

4. INTELLECTUAL PROPERTY
   All work product remains the property of the client upon full payment.

5. LIABILITY
   Our liability is limited to the amount paid for services rendered.

6. GOVERNING LAW
   This agreement is governed by the laws of the jurisdiction where services are performed.`,
          clientComments: '',
          isRecurring: false,
          billingPeriod: '',
          recurringAmount: 0,
          quoteHistory: [],
          selectedHistoryVersion: '',
          paymentSchedule: [
            { id: 'ps-1', percentage: 100, description: 'net 30 days' },
          ],
        }

        // Set the form data to the new quote
        setFormData(newQuoteFormData)

        // Close the modal
        closeNewQuoteModal()

        // Don't save to database yet - wait for user to click save button
        setSaveMessage({ type: 'info', text: `New quote ${newQuoteData.quoteNumber.trim()} created! Click the save button when ready to save to database.` })
      } catch (error) {
        console.error('Error creating new quote:', error)
        setSaveMessage({ type: 'error', text: `Error creating new quote: ${error instanceof Error ? error.message : 'Unknown error'}` })
      } finally {
        setIsCreatingQuote(false)
      }
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
    setFormData(prev => ({ ...prev, [field]: value }))

    // If client name changes, load their quotes
    if (field === 'clientName' && typeof value === 'string' && value.trim()) {
      loadClientQuotesByName(value.trim())
    }
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

  const saveQuote = async (quoteData?: QuoteFormData) => {
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

      // First, create or get the client
      let clientId = null
      if (dataToSave.clientName || dataToSave.clientEmail) {
        console.log('Processing client:', { name: dataToSave.clientName, email: dataToSave.clientEmail })

        // Try to find existing client by name first
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
        } else {
          console.log('Creating new client...')
          // Create new client - ensure we have a valid email
          const clientEmail = dataToSave.clientEmail || `${dataToSave.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`
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
        // Quote exists - update it instead of creating a new one
        console.log('Quote with number', dataToSave.quoteNumber, 'already exists, updating...')
        quoteId = existingQuote.id

        // Update the existing quote
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            client_id: clientId,
            status: 'draft',
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
            status: 'draft',
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
      } else {
        // Quote doesn't exist - create a new one
        console.log('Creating new quote with number:', dataToSave.quoteNumber)

        const { data: quote, error } = await supabase
          .from('quotes')
          .insert({
            owner_id: '11111111-1111-1111-1111-111111111111', // Temporary placeholder - replace with actual auth.uid() when auth is implemented
            client_id: clientId,
            status: 'draft',
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
          status: 'draft',
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
            status: 'draft',
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
        status: 'draft',
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

      setSaveMessage({ type: 'success', text: 'Quote saved successfully!' })

      // Reload the quote history to include the new quote
      await loadQuoteHistory(quoteId)

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
        } else if ('details' in error) {
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

  const openViewQuoteModal = async () => {
    setIsViewQuoteModalOpen(true)
    await loadAvailableClients()
  }

  const closeViewQuoteModal = () => {
    setIsViewQuoteModalOpen(false)
    setSelectedClientId('')
    setAvailableClients([])
  }

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

  const handleClientSelection = async (clientId: string) => {
    setSelectedClientId(clientId)
    // Load the first quote for this client
    await loadClientQuotes(clientId)
    if (clientQuotes.length > 0) {
      // Load the first quote
      await loadQuote(clientQuotes[0].id)
    }
    closeViewQuoteModal()
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
    loadClientQuotes,
    clientQuotes,
    isLoadingClientQuotes,
    selectedClientQuote,
    setSelectedClientQuote,
    loadClientQuotesByName,
    // View Quote Modal
    isViewQuoteModalOpen,
    openViewQuoteModal,
    closeViewQuoteModal,
    availableClients,
    isLoadingAvailableClients,
    selectedClientId,
    handleClientSelection,
  }
}

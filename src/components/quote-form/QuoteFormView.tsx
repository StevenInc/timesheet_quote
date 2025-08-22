import React from 'react'
import { Add, Visibility, Description, Save, Send, ContentCopy, Download, Delete } from '@mui/icons-material'
import '../QuoteForm.css'
import scopedCss from '../QuoteFormView.module.css'
import type { QuoteFormData, QuoteItem, PaymentTermItem, NewQuoteModalData, ClientQuote, DatabaseQuoteRevision, ClientSuggestion } from './types'

// Payment Schedule Options
const PAYMENT_SCHEDULE_OPTIONS = [
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 60',
  'Net 90',
  '2/10 Net 30',
  'Due Upon Receipt',
  'End of Month',
  'Cash in Advance',
  'Payment in Advance',
  'Cash on Delivery',
  'Early Payment Discounts'
]


interface Props {
  formData: QuoteFormData
  setFormData: (data: QuoteFormData | ((prev: QuoteFormData) => QuoteFormData)) => void
  paymentScheduleTotal: number
  // item handlers
  updateItem: (id: string, field: keyof QuoteItem, value: string | number | boolean) => void
  addItem: () => void
  removeItem: (id: string) => void
  // form handlers
  handleInputChange: (field: keyof QuoteFormData, value: string | number | boolean) => void
  // payment term handlers
  updatePaymentTerm: (id: string, field: keyof PaymentTermItem, value: string | number) => void
  addPaymentTerm: () => void
  removePaymentTerm: (id: string) => void

  // misc
  onSubmit: (e: React.FormEvent) => void
  copyQuoteUrl: () => void
  downloadQuote: () => void
  loadQuoteHistory: (quoteId?: string) => void
  // save state
  isSaving: boolean
  saveMessage: { type: 'success' | 'error'; text: string } | null
  // quote actions
  saveQuote: () => Promise<{ quoteId: string; success: boolean }>
  sendQuoteToClient: () => Promise<void>
  // new quote modal
  isNewQuoteModalOpen: boolean
  newQuoteData: NewQuoteModalData
  openNewQuoteModal: () => void
  closeNewQuoteModal: () => void
  createNewQuote: () => void
  updateNewQuoteData: (field: keyof NewQuoteModalData, value: string) => void
  clientSuggestions: ClientSuggestion[]
  isLoadingClients: boolean
  isCreatingQuote: boolean
  // client quotes
  loadClientQuotes: (clientId: string) => void
  clientQuotes: ClientQuote[]
  isLoadingClientQuotes: boolean
  selectedClientQuote: string
  setSelectedClientQuote: (quoteId: string) => void
  handleQuoteSelection: (quoteId: string) => Promise<void>
  // quote revisions
  quoteRevisions: DatabaseQuoteRevision[]
  isLoadingQuoteRevisions: boolean
  loadQuoteRevisions: (quoteId: string) => void
  loadQuoteRevision: (revisionId: string) => void
  // revision state tracking
  currentLoadedRevisionId: string | null
  currentLoadedQuoteId: string | null
  clearLoadedRevisionState: () => void
  resetForm: () => Promise<void>
  // view quote modal
  isViewQuoteModalOpen: boolean
  openViewQuoteModal: () => void
  closeViewQuoteModal: () => void
  loadAvailableClients: () => Promise<void>
  handleClientSelection: (clientId: string) => Promise<void>

  selectedClientId: string
  setSelectedClientId: (clientId: string) => void

  // Default Legal Terms modal
  isDefaultLegalTermsModalOpen: boolean
  openDefaultLegalTermsModal: () => void
  closeDefaultLegalTermsModal: () => void
  saveDefaultLegalTerms: (terms: string) => Promise<void>
  defaultLegalTerms: string
  // Change tracking
  hasUnsavedChanges: boolean
}

export const QuoteFormView: React.FC<Props> = (props) => {
    // Local state for tax input to prevent jumping while typing
  const [taxInputValue, setTaxInputValue] = React.useState('')

  // Local state for default legal terms modal
  const [localDefaultLegalTerms, setLocalDefaultLegalTerms] = React.useState('')

  // Track which quote we've already auto-loaded for to prevent infinite loops
  const autoLoadedQuoteRef = React.useRef<string | null>(null)
  const loadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastProcessedQuoteRef = React.useRef<string | null>(null)
  const loadQuoteRevisionRef = React.useRef(props.loadQuoteRevision)
  const loadQuoteRevisionsRef = React.useRef(props.loadQuoteRevisions)
  const clearLoadedRevisionStateRef = React.useRef(props.clearLoadedRevisionState)
  const isProcessingRef = React.useRef<boolean>(false)



  // Update the refs when the functions change
  React.useEffect(() => {
    loadQuoteRevisionRef.current = props.loadQuoteRevision
  }, [props.loadQuoteRevision])

  // Initialize local default legal terms when modal opens
  React.useEffect(() => {
    if (props.isDefaultLegalTermsModalOpen) {
      setLocalDefaultLegalTerms(props.defaultLegalTerms)
    }
  }, [props.isDefaultLegalTermsModalOpen, props.defaultLegalTerms])

  // Load available clients when View Quotes modal opens
  React.useEffect(() => {
    if (props.isViewQuoteModalOpen) {
      props.loadAvailableClients()
    }
  }, [props.isViewQuoteModalOpen, props.loadAvailableClients])

  React.useEffect(() => {
    loadQuoteRevisionsRef.current = props.loadQuoteRevisions
  }, [props.loadQuoteRevisions])

  React.useEffect(() => {
    clearLoadedRevisionStateRef.current = props.clearLoadedRevisionState
  }, [props.clearLoadedRevisionState])

  // Single useEffect to handle quote selection and revision loading
  React.useEffect(() => {
    console.log('=== QUOTE SELECTION USE_EFFECT TRIGGERED ===')
    console.log('useEffect triggered with selectedClientQuote:', props.selectedClientQuote)

    // Prevent processing if already in progress
    if (isProcessingRef.current) {
      console.log('❌ Already processing, skipping')
      return
    }

    if (!props.selectedClientQuote) {
      console.log('❌ No quote selected, clearing state')
      clearLoadedRevisionStateRef.current()
      autoLoadedQuoteRef.current = null
      lastProcessedQuoteRef.current = null
      return
    }

    // Prevent processing the same quote multiple times
    if (lastProcessedQuoteRef.current === props.selectedClientQuote) {
      console.log('❌ Same quote already processed, skipping:', props.selectedClientQuote)
      return
    }

    console.log('✅ Processing new quote selection:', props.selectedClientQuote)
    isProcessingRef.current = true
    lastProcessedQuoteRef.current = props.selectedClientQuote

    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current)
    }

    // Clear previous revision state
    console.log('🧹 Clearing previous revision state')
    clearLoadedRevisionStateRef.current()
    autoLoadedQuoteRef.current = null

    // Load quote revisions with a delay to prevent rapid successive calls
    loadTimeoutRef.current = setTimeout(async () => {
      console.log('📥 Loading quote revisions for quote:', props.selectedClientQuote)
      await loadQuoteRevisionsRef.current(props.selectedClientQuote)
      console.log('✅ Quote revisions loaded, marking processing as complete IMMEDIATELY')
      // Mark processing as complete IMMEDIATELY after revisions are loaded
      isProcessingRef.current = false
      console.log('🎯 Processing complete, auto-selection can now proceed')
    }, 100)

  }, [props.selectedClientQuote]) // Only depend on selectedClientQuote

  // Separate useEffect to handle auto-loading the most recent revision
  React.useEffect(() => {
    console.log('=== REVISIONS USE_EFFECT TRIGGERED ===')
    console.log('Revisions useEffect triggered:', {
      revisionsCount: props.quoteRevisions.length,
      currentLoadedRevisionId: props.currentLoadedRevisionId,
      selectedClientQuote: props.selectedClientQuote,
      autoLoadedQuote: autoLoadedQuoteRef.current,
      isProcessing: isProcessingRef.current
    })

    // Don't auto-load if we're still processing the quote selection
    if (isProcessingRef.current) {
      console.log('❌ Still processing quote selection, skipping auto-load')
      return
    }

    // Auto-load the most recent revision when revisions are available and no revision is currently loaded
    if (props.quoteRevisions.length > 0 &&
        !props.currentLoadedRevisionId &&
        props.selectedClientQuote) {

      const mostRecentRevision = props.quoteRevisions[0]
      if (mostRecentRevision) {
        console.log('✅ CONDITIONS MET - Auto-loading most recent revision:', mostRecentRevision.id)
        autoLoadedQuoteRef.current = props.selectedClientQuote

        // Use a delay to ensure the previous operations complete
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current)
        }
        loadTimeoutRef.current = setTimeout(() => {
          console.log('🚀 EXECUTING auto-load of revision:', mostRecentRevision.id)
          loadQuoteRevisionRef.current(mostRecentRevision.id)
        }, 300) // Reduced delay for better responsiveness
      }
    } else if (props.quoteRevisions.length > 0 && props.currentLoadedRevisionId) {
      console.log('ℹ️ Revision already loaded, no need for auto-selection')
    } else if (props.quoteRevisions.length === 0) {
      console.log('❌ No revisions available for auto-selection')
    } else if (!props.selectedClientQuote) {
      console.log('❌ No quote selected, skipping auto-selection')
    } else {
      console.log('❌ Auto-selection conditions not met:', {
        hasRevisions: props.quoteRevisions.length > 0,
        hasCurrentRevision: !!props.currentLoadedRevisionId,
        hasSelectedQuote: !!props.selectedClientQuote
      })
    }
  }, [props.quoteRevisions, props.currentLoadedRevisionId, props.selectedClientQuote]) // Use full array to ensure effect triggers

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
      }
    }
  }, [])

  const {
    formData,
    paymentScheduleTotal,
    updateItem,
    addItem,
    removeItem,
    handleInputChange,
    updatePaymentTerm,
    addPaymentTerm,
    removePaymentTerm,
    onSubmit,
    copyQuoteUrl,
    downloadQuote,
    saveMessage,

    isNewQuoteModalOpen,
    newQuoteData,
    openNewQuoteModal,
    closeNewQuoteModal,
    createNewQuote,
    updateNewQuoteData,
    clientSuggestions,
    isLoadingClients,
    isCreatingQuote,
    loadClientQuotes,
    clientQuotes,
    isLoadingClientQuotes,
    selectedClientQuote,
    setSelectedClientQuote,
    handleQuoteSelection,
    // quote revisions
    quoteRevisions,
    isLoadingQuoteRevisions,
    isViewQuoteModalOpen,
    openViewQuoteModal,
    closeViewQuoteModal,
    handleClientSelection,

    selectedClientId,

    setSelectedClientId,
    // change tracking
    hasUnsavedChanges,
  } = props

  // Initialize tax input value when form data changes
  React.useEffect(() => {
    if (formData.isTaxEnabled) {
      setTaxInputValue((formData.taxRate * 100).toFixed(2))
    }
    // Don't clear taxInputValue when checkbox is unchecked - preserve the value
  }, [formData.taxRate, formData.isTaxEnabled])

  return (
    <div className="quote-form-container">
      <div className="quote-form-header">
        <div className="header-left">
          <h1>Add or Edit a Quote</h1>
          <div className="quote-number-display">
            <span className="quote-number-label">Quote #</span>
            <span className="quote-number-value">{formData.quoteNumber}</span>
          </div>
          {formData.creatorName && (
            <div className="quote-creator-display">
              <span className="quote-creator-label">Created By:</span>
              <span className="quote-creator-value">{formData.creatorName}</span>
              {formData.createdAt && (
                <span className="quote-created-date">
                  on {new Date(formData.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          <div className="quote-url-section">
            {props.currentLoadedRevisionId ? (
              <a
                href={`${window.location.origin}?revision=${props.currentLoadedRevisionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="quote-url clickable"
                title="Click to preview quote in new tab"
              >
                {formData.quoteUrl}
              </a>
            ) : (
              <span className="quote-url">{formData.quoteUrl}</span>
            )}
            <button type="button" className="btn btn-icon" onClick={copyQuoteUrl}>
                              <ContentCopy sx={{ fontSize: 16 }} />
            </button>
            <button type="button" className="btn btn-icon" onClick={downloadQuote}>
                              <Download sx={{ fontSize: 16 }} />
            </button>
            {props.currentLoadedRevisionId && (
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => {
                  const clientUrl = `${window.location.origin}?revision=${props.currentLoadedRevisionId}`
                  navigator.clipboard.writeText(clientUrl)
                  alert('Client quote URL copied to clipboard!')
                }}
                title="Copy Client URL"
              >
                👤
              </button>
            )}
          </div>
        </div>
        <div className="header-right">
          {/* New Quote Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={openNewQuoteModal}
          >
            <Add sx={{ fontSize: 16 }} />
            New Quote
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openViewQuoteModal}
          >
            <Visibility sx={{ fontSize: 16 }} />
            View Quotes
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={props.openDefaultLegalTermsModal}
          >
            <Description sx={{ fontSize: 16 }} />
            Default Legal Terms
          </button>
        </div>
      </div>

      {/* Save message display */}
      {saveMessage && (
        <div className={`save-message ${saveMessage.type}`}>
          {saveMessage.text}
        </div>
      )}



      <form onSubmit={onSubmit} className="quote-form">
        <div className="form-content">
          <div className="form-column left-column">
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  maxLength={100}
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter a short title for this quote revision (max 100 characters)"
                />
                <small className="form-help">This title will be saved with the quote revision</small>
              </div>
              <div className="form-group">
                <label htmlFor="owner">Sales Person / Owner</label>
                <select id="owner" value={formData.owner} onChange={(e) => handleInputChange('owner', e.target.value)}>
                  <option value="">-- Select One --</option>
                  <option value="11111111-1111-1111-1111-111111111111">Owner 1</option>
                  <option value="22222222-2222-2222-2222-222222222222">Owner 2</option>
                </select>
                {formData.ownerName && formData.ownerName !== 'Unknown Owner' && (
                  <small className="form-help">Current: {formData.ownerName}</small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="clientName">Client Name</label>
                <input
                  type="text"
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientEmail">Email Address</label>
                <input
                  type="email"
                  id="clientEmail"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientComments">Client Comments (Office Notes - not included in quote)</label>
                <textarea
                  id="clientComments"
                  value={formData.clientComments}
                  onChange={(e) => handleInputChange('clientComments', e.target.value)}
                  rows={3}
                  placeholder="Internal office notes about this client..."
                />
              </div>

            </div>

            <div className="form-section">
              <h2>Quote Items</h2>
              <div className="items-table">
                <div className="table-header">
                  <div className="header-cell">Description</div>
                  <div className="header-cell">Recurring</div>
                  <div className="header-cell">Quantity</div>
                  <div className="header-cell">Unit Price</div>
                  <div className="header-cell">Taxable</div>
                  <div className="header-cell">Item Total</div>
                  <div className="header-cell" aria-hidden="true"></div>
                </div>
                {formData.items.map((item) => (
                  <div key={item.id} className="table-row">
                    <div className="table-cell desc-cell">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="table-cell recurring-cell">
                      <select
                        value={item.recurring || 'none'}
                        onChange={(e) => updateItem(item.id, 'recurring', e.target.value === 'none' ? 'none' : e.target.value)}
                        className="recurring-select"
                      >
                        <option value="none">None</option>
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-Weekly</option>
                        <option value="semi-monthly">Semi-Monthly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="semi-annually">Semi-Annually</option>
                        <option value="annually">Annually</option>
                      </select>
                    </div>
                    <div className="table-cell quantity-cell  ">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="table-cell unit-price-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="table-cell taxable-cell">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateItem(item.id, 'taxable' as keyof QuoteItem, e.target.checked)}
                        className="taxable-checkbox"
                      />
                    </div>
                    <div className="table-cell total-cell">${item.total.toFixed(2)}</div>
                    <div className="table-cell">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Delete sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-link add-more-btn" onClick={addItem}>
                add more...
              </button>
            </div>

            <div className="form-section totals-section">
              <div className="form-group-horizontal" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <label htmlFor="taxRate" className="tax-rate-input-label" style={{ marginBottom: 0, whiteSpace: 'nowrap', lineHeight: '1', opacity: formData.items.some(item => item.taxable) ? 1 : 0.5 }}>Tax Rate (%)</label>
                <input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={taxInputValue || (formData.taxRate * 100).toFixed(2)}
                  onChange={(e) => {
                    const value = e.target.value
                    setTaxInputValue(value)
                  }}
                  onBlur={() => {
                    if (taxInputValue !== '') {
                      const taxPercent = parseFloat(taxInputValue) || 0
                      const taxRate = taxPercent / 100
                      handleInputChange('taxRate', taxRate)
                    }
                    setTaxInputValue('')
                  }}
                  disabled={!formData.items.some(item => item.taxable)}
                />
              </div>
              <div className="totals-grid">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${formData.subtotal.toFixed(2)}</span>
                </div>
                {formData.items.some(item => item.taxable) && (
                  <div className="total-row">
                    <span>Taxable Subtotal:</span>
                    <span>${formData.items.reduce((sum, item) => sum + (item.taxable ? item.total : 0), 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="total-row">
                  <span>Tax:</span>
                  <span>${formData.tax.toFixed(2)}</span>
                </div>
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span>${formData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="expires">Expires</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    id="expires"
                    value={formData.expires}
                    onChange={(e) => handleInputChange('expires', e.target.value)}
                  />
                </div>
              </div>


              <div className="form-group">
                <label>Payment Schedule</label>
                <div className="items-table schedule-table">
                                  <div className="table-header">
                  <div className="header-cell">Percent</div>
                  <div className="header-cell">Description</div>
                  <div className="header-cell" aria-hidden="true"></div>
                </div>
                  {formData.paymentSchedule.map((t) => (
                    <div key={t.id} className="table-row">
                      <div className="table-cell">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={t.percentage}
                          onChange={(e) => updatePaymentTerm(t.id, 'percentage', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="table-cell">
                        <select
                          value={t.description}
                          onChange={(e) => updatePaymentTerm(t.id, 'description', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">-- Select Description --</option>
                          {PAYMENT_SCHEDULE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="table-cell">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removePaymentTerm(t.id)}>
                          <Delete sx={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="schedule-footer">
                  <button type="button" className="btn btn-link add-more-btn" onClick={addPaymentTerm}>
                    Add Terms
                  </button>
                  <div className={`schedule-total ${paymentScheduleTotal !== 100 ? 'warn' : ''}`}>
                    Total: {paymentScheduleTotal.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="legalTerms">Legal Terms</label>
                <textarea
                  id="legalTerms"
                  value={formData.legalTerms}
                  onChange={(e) => handleInputChange('legalTerms', e.target.value)}
                  rows={3}
                  placeholder="Legal terms and conditions..."
                />
              </div>
            </div>
          </div>

          <div className="form-column right-column">
            <div className="form-section quote-version">
              <h3>Quote Versions</h3>
              <div className="quote-versions-container">
                {!selectedClientQuote ? (
                  <div className="quote-versions-empty">
                    <span>Click "View Quotes" to select a company and view quote versions</span>
                  </div>
                ) : isLoadingQuoteRevisions ? (
                  <div className="quote-versions-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading quote versions...</span>
                  </div>
                ) : quoteRevisions.length === 0 ? (
                  <div className="quote-versions-empty">
                    <span>No versions found for this quote</span>
                  </div>
                ) : (
                  <table className="quote-versions-table">
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Sent/Viewed</th>
                        <th>Status</th>
                        <th>Title</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteRevisions.map((revision) => (
                        <tr
                          key={revision.id}
                          className={`quote-version-row clickable ${
                            props.currentLoadedRevisionId === revision.id ? 'active-revision' : ''
                          }`}
                          onClick={() => props.loadQuoteRevision(revision.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>v{revision.revision_number}</td>
                          <td>
                            <div className="sent-viewed-info">
                              {(() => {
                                // Priority: VIEWED > SENT > blank
                                if (revision.viewed_at) {
                                  return (
                                    <span
                                      className="status-badge viewed"
                                      title={`Viewed on ${new Date(revision.viewed_at).toLocaleDateString()}`}
                                    >
                                      VIEWED
                                    </span>
                                  )
                                }
                                if (revision.sent_via_email || revision.status === 'EMAILED') {
                                  return (
                                    <span
                                      className="status-badge emailed"
                                      title={revision.sent_at ? `Sent on ${new Date(revision.sent_at).toLocaleDateString()}` : ''}
                                    >
                                      SENT
                                    </span>
                                  )
                                }
                                // Return blank if never emailed
                                return null
                              })()}
                              {/* Show latest viewed version info */}
                              {/* Commented out unused code for now */}
                            </div>
                          </td>
                          <td>
                            {(() => {
                              // Priority order: ACCEPTED > DECLINED > EXPIRED
                              if (revision.status === 'APPROVED') {
                                return <span className="status-badge accepted">ACCEPTED</span>
                              }
                              if (revision.status === 'REJECTED') {
                                return <span className="status-badge declined">DECLINED</span>
                              }
                              // Check if expired (not approved/declined and past expiration date)
                              if (revision.expires_on && new Date(revision.expires_on) < new Date()) {
                                return <span className="status-badge expired">EXPIRED</span>
                              }
                              return null
                            })()}
                          </td>
                          <td>{revision.title || revision.notes || '-'}</td>
                          <td>{new Date(revision.updated_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>




          </div>
        </div>



        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={props.isSaving || (props.currentLoadedRevisionId ? !hasUnsavedChanges : !formData.title?.trim())}>
            <Save sx={{ fontSize: 16 }} />
            {props.isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="btn btn-primary" onClick={props.sendQuoteToClient} disabled={props.isSaving || !props.currentLoadedRevisionId || hasUnsavedChanges}>
            <Send sx={{ fontSize: 16 }} />
            {props.isSaving ? 'Sending...' : 'Send to Client'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={props.resetForm} disabled={props.isSaving}>
            Cancel
          </button>
        </div>
      </form>

      {/* New Quote Modal */}
      {isNewQuoteModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Select client to create quote">
          <div className="modal">
            <h3>Select Client to Create Quote</h3>
            <div className="form-group">
              <label htmlFor="newQuoteNumberInput">Quote Number</label>
              <input
                id="newQuoteNumberInput"
                type="text"
                value={newQuoteData.quoteNumber}
                onChange={(e) => updateNewQuoteData('quoteNumber', e.target.value)}
                placeholder="Enter quote number"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    createNewQuote()
                  }
                }}
              />
              <small className="form-help">This will be the next available quote number by default</small>
            </div>
            <div className="form-group">
              <label>Available Clients</label>
              <div className="clients-list-container">
                {isLoadingClients ? (
                  <div className="clients-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading clients...</span>
                  </div>
                ) : (
                  <div className="clients-list">
                    {clientSuggestions.map((client) => (
                      <div
                        key={client.id}
                        className={`client-item ${newQuoteData.selectedClientId === client.id ? 'selected' : ''}`}
                        onClick={() => updateNewQuoteData('selectedClientId', client.id)}
                      >
                        <div className="client-name">{client.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <small className="form-help">Click on a client to select them for the new quote</small>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeNewQuoteModal} disabled={isCreatingQuote}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={createNewQuote}
                disabled={isCreatingQuote || !newQuoteData.selectedClientId}
              >
                {isCreatingQuote ? 'Creating...' : 'Create Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Quote Modal */}
      {isViewQuoteModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Select client to view quote">
          <div className="modal company-quote-history-modal">
            {/* Client Selection Section - Show when no client is selected */}
            {!selectedClientId && (
              <>
                <h3>Select a customer</h3>
                <div className={`form-section ${scopedCss['customer-form-section']}`}>

                  <div className="form-group">
                    {/* <label>Available Companies</label> */}
                    <div className="clients-list-container">
                      {isLoadingClients ? (
                        <div className="clients-loading">
                          <div className="loading-spinner"></div>
                          <span>Loading companies...</span>
                        </div>
                      ) : clientSuggestions.length === 0 ? (
                        <div className="clients-empty">
                          <span>No companies found</span>
                        </div>
                      ) : (
                        <ul className="clients-list">
                          {clientSuggestions.map((client) => (
                            <li
                              key={client.id}
                              className="client-item"
                              onClick={() => handleClientSelection(client.id)}
                            >
                              <div className="client-name">{client.name}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Company Quotes Section - Show when a client is selected */}
            {selectedClientId && (
              <>
                <div className="section-header-with-back">
                  <h3>
                    Quotes
                  </h3>
                  <button
                    type="button"
                    className="btn btn-link btn-small"
                    onClick={() => {
                      setSelectedClientId('')
                      setSelectedClientQuote('')
                    }}
                  >
                    ← Back to Company List
                  </button>
                </div>
                <div className="form-section">
                  <div className="history-table-container">
                    {isLoadingClientQuotes ? (
                      <div className="history-loading">
                        <div className="loading-spinner"></div>
                        <span>Loading quotes...</span>
                      </div>
                    ) : clientQuotes.length === 0 ? (
                      <div className="history-empty">
                        <span>No quotes found for this client</span>
                        <button
                          type="button"
                          className="btn btn-link"
                          onClick={() => selectedClientId && loadClientQuotes(selectedClientId)}
                        >
                          Load Quotes
                        </button>
                      </div>
                    ) : (
                      <div className="quotes-selection-info">
                        <p className="selection-help">Click on a quote below to load it into the form:</p>
                        <table className="history-table">
                          <thead>
                            <tr>
                              <th>Quote #</th>
                              <th>Title</th>
                              <th>Rev</th>
                              <th>Owner</th>
                              <th>Last Updated</th>
                              <th>Sent/Viewed</th>
                              <th>Status</th>
                              <th>Expiration Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientQuotes.map((quote) => {
                              // Debug logging for quote data
                              console.log('Rendering quote:', quote.quoteNumber, {
                                lastViewedRevisionNumber: quote.lastViewedRevisionNumber,
                                lastSentRevisionNumber: quote.lastSentRevisionNumber,
                                lastViewedAt: quote.lastViewedAt,
                                lastSentAt: quote.lastSentAt
                              })

                              return (
                                <tr
                                  key={quote.id}
                                  className={`history-row ${selectedClientQuote === quote.id ? 'selected' : ''}`}
                                  onClick={() => handleQuoteSelection(quote.id)}
                                >
                                <td>{quote.quoteNumber}</td>
                                <td className="notes-cell" title={quote.title || quote.notes || 'No title'}>
                                  <div className="title-info">
                                    <span className="title-text">
                                      {quote.title ?
                                        (quote.title.length > 30 ?
                                          `${quote.title.substring(0, 30)}...` :
                                          quote.title
                                        ) :
                                        quote.notes ?
                                          (quote.notes.length > 30 ?
                                            `${quote.notes.substring(0, 30)}...` :
                                            quote.notes
                                          ) :
                                          'No title'
                                      }
                                    </span>
                                  </div>
                                </td>
                                <td className="revision-cell">
                                  <span className="revision-count-badge">
                                    {quote.totalRevisions} rev{quote.totalRevisions === 1 ? '' : 's'}
                                  </span>
                                </td>
                                <td className="creator-cell">
                                  {quote.creatorName || 'Unknown'}
                                </td>
                                <td>{quote.lastUpdated}</td>
                                <td className="sent-viewed-cell">
                                  {quote.lastViewedAt ? (
                                    <div className="sent-badge-container">
                                      <span className="viewed-date-badge">
                                        {quote.lastViewedAt}
                                      </span>
                                      {quote.lastViewedRevisionNumber && (
                                        <span className="revision-badge">v{quote.lastViewedRevisionNumber}</span>
                                      )}
                                    </div>
                                  ) : quote.lastSentAt ? (
                                    <div className="sent-badge-container">
                                      <span className="sent-date-badge">
                                        {quote.lastSentAt}
                                      </span>
                                      {quote.lastSentRevisionNumber && (
                                        <span className="revision-badge">v{quote.lastSentRevisionNumber}</span>
                                      )}
                                    </div>
                                  ) : null}
                                </td>
                                <td>
                                  <div className="status-info">
                                    {quote.status && (
                                      <span className={`status-badge ${quote.status.toLowerCase()}`}>
                                        {quote.status}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="expiration-cell">
                                  {quote.expirationDate || 'Not set'}
                                </td>
                              </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeViewQuoteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

            {/* Default Legal Terms Modal */}
      {props.isDefaultLegalTermsModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit default legal terms">
          <div className="modal">
            <h3>Edit Default Legal Terms</h3>
            <div className="form-group">
              <label htmlFor="defaultLegalTerms">Default Legal Terms</label>
              <textarea
                id="defaultLegalTerms"
                rows={10}
                placeholder="Enter the default legal terms that will be automatically loaded for new quotes..."
                value={localDefaultLegalTerms}
                onChange={(e) => {
                  setLocalDefaultLegalTerms(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault()
                    const terms = localDefaultLegalTerms.trim()
                    if (terms) {
                      props.saveDefaultLegalTerms(terms)
                      setLocalDefaultLegalTerms('')
                    }
                  }
                }}
              />
              <small className="form-help">
                These terms will be automatically loaded when creating new quotes.
                Press Ctrl+Enter to save.
              </small>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => {
                setLocalDefaultLegalTerms('')
                props.closeDefaultLegalTermsModal()
              }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const terms = localDefaultLegalTerms.trim()
                  if (terms) {
                    props.saveDefaultLegalTerms(terms)
                    setLocalDefaultLegalTerms('')
                  }
                }}
              >
                Save Terms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuoteFormView
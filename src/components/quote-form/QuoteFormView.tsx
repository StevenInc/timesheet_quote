import React from 'react'
import { Trash2, Save, Send, Archive, Copy, Download, Plus, Eye } from 'lucide-react'
import '../QuoteForm.css'
import type { QuoteFormData, QuoteItem, PaymentTermItem, NewQuoteModalData, ClientQuote, DatabaseQuoteRevision } from './types'

interface Props {
  formData: QuoteFormData
  paymentScheduleTotal: number
  // item handlers
  updateItem: (id: string, field: keyof QuoteItem, value: string | number) => void
  addItem: () => void
  removeItem: (id: string) => void
  // form handlers
  handleInputChange: (field: keyof QuoteFormData, value: string | number | boolean) => void
  handleCheckboxChange: (field: keyof QuoteFormData, value: boolean) => void
  // payment term handlers
  updatePaymentTerm: (id: string, field: keyof PaymentTermItem, value: string | number) => void
  addPaymentTerm: () => void
  removePaymentTerm: (id: string) => void
  // tax modal
  isTaxModalOpen: boolean
  openTaxModal: () => void
  closeTaxModal: () => void
  tempTaxRatePercent: number
  setTempTaxRatePercent: (v: number) => void
  applyNewTaxRate: () => void
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
  clientSuggestions: string[]
  setClientSuggestions: (suggestions: string[]) => void
  isLoadingClients: boolean
  searchClients: (searchTerm: string) => void
  isCreatingQuote: boolean
  // client quotes
  loadClientQuotes: (clientId: string) => void
  clientQuotes: ClientQuote[]
  isLoadingClientQuotes: boolean
  selectedClientQuote: string
  setSelectedClientQuote: (quoteId: string) => void
  // quote revisions
  quoteRevisions: DatabaseQuoteRevision[]
  isLoadingQuoteRevisions: boolean
  loadQuoteRevisions: (quoteId: string) => void
  loadQuoteRevision: (revisionId: string) => void
  archiveQuoteRevision: (revisionId: string) => void
  // revision state tracking
  currentLoadedRevisionId: string | null
  currentLoadedQuoteId: string | null
  clearLoadedRevisionState: () => void
  resetForm: () => void
  // view quote modal
  isViewQuoteModalOpen: boolean
  openViewQuoteModal: () => void
  closeViewQuoteModal: () => void
  isLoadingAvailableClients: boolean
  availableClients: { id: string; name: string; email: string }[]
  selectedClientId: string
  handleClientSelection: (clientId: string) => void
  // title modal
  isTitleModalOpen: boolean
  openTitleModal: (quoteData: QuoteFormData, quoteId: string, revisionId: string) => void
  closeTitleModal: () => void
  submitTitleAndCompleteSave: (title: string) => void
  // Change tracking
  hasUnsavedChanges: boolean
}

export const QuoteFormView: React.FC<Props> = (props) => {
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
    handleCheckboxChange,
    updatePaymentTerm,
    addPaymentTerm,
    removePaymentTerm,
    isTaxModalOpen,
    openTaxModal,
    closeTaxModal,
    tempTaxRatePercent,
    setTempTaxRatePercent,
    applyNewTaxRate,
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
    setClientSuggestions,
    isLoadingClients,
    searchClients,
    isCreatingQuote,
    loadClientQuotes,
    clientQuotes,
    isLoadingClientQuotes,
    selectedClientQuote,
    setSelectedClientQuote,
    // quote revisions
    quoteRevisions,
    isLoadingQuoteRevisions,
    archiveQuoteRevision,
    isViewQuoteModalOpen,
    openViewQuoteModal,
    closeViewQuoteModal,
    isLoadingAvailableClients,
    availableClients,
    selectedClientId,
    handleClientSelection,
    // title modal
    // isTitleModalOpen,
    // openTitleModal,
    // closeTitleModal,
    // submitTitleAndCompleteSave,
    // change tracking
    hasUnsavedChanges,
  } = props

  return (
    <div className="quote-form-container">
      <div className="quote-form-header">
        <div className="header-left">
          <h1>Add or Edit a Quote</h1>
          <div className="quote-number-display">
            <span className="quote-number-label">Quote #</span>
            <span className="quote-number-value">{formData.quoteNumber}</span>
          </div>
          <div className="quote-url-section">
            <span className="quote-url">{formData.quoteUrl}</span>
            <button type="button" className="btn btn-icon" onClick={copyQuoteUrl}>
              <Copy size={16} />
            </button>
            <button type="button" className="btn btn-icon" onClick={downloadQuote}>
              <Download size={16} />
            </button>
          </div>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="btn btn-success"
            onClick={openViewQuoteModal}
          >
            <Eye size={16} />
            View Quotes
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openNewQuoteModal}
          >
            <Plus size={16} />
            New Quote
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
                <label htmlFor="owner">Owner</label>
                <select id="owner" value={formData.owner} onChange={(e) => handleInputChange('owner', e.target.value)}>
                  <option value="">-- Select One --</option>
                  <option value="owner1">Owner 1</option>
                  <option value="owner2">Owner 2</option>
                </select>
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
            </div>

            <div className="form-section">
              <h2>Quote Items</h2>
              <div className="items-table">
                <div className="table-header">
                  <div className="header-cell">Description</div>
                  <div className="header-cell">Quantity</div>
                  <div className="header-cell">Unit Price</div>
                  <div className="header-cell">Item Total</div>
                  <div className="header-cell" aria-hidden="true"></div>
                </div>
                {formData.items.map((item) => (
                  <div key={item.id} className="table-row">
                    <div className="table-cell">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="table-cell total-cell">${item.total.toFixed(2)}</div>
                    <div className="table-cell">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(item.id)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 size={14} />
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
              <div className="checkbox-group" style={{ marginBottom: '0.5rem' }}>
                <label className="checkbox-label" onClick={() => formData.isTaxEnabled && openTaxModal()}>
                  <input
                    type="checkbox"
                    checked={formData.isTaxEnabled}
                    onChange={(e) => handleCheckboxChange('isTaxEnabled', e.target.checked)}
                  />
                  Apply Tax ({(formData.taxRate * 100).toFixed(2)}%)
                </label>
              </div>
              <div className="totals-grid">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${formData.subtotal.toFixed(2)}</span>
                </div>
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
                        <input
                          type="text"
                          value={t.description}
                          onChange={(e) => updatePaymentTerm(t.id, 'description', e.target.value)}
                          placeholder="e.g., with order"
                        />
                      </div>
                      <div className="table-cell">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removePaymentTerm(t.id)}>
                          <Trash2 size={14} />
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
            <div className="form-section">
              <h3>
                Company Quote History
                {selectedClientId && availableClients.length > 0 && (
                  <span className="company-name">
                    {' '}- {availableClients.find(client => client.id === selectedClientId)?.name}
                  </span>
                )}
              </h3>
              <div className="history-table-container">
                {isLoadingClientQuotes ? (
                  <div className="history-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading quotes...</span>
                  </div>
                ) : clientQuotes.length === 0 ? (
                  <div className="history-empty">
                    <span>No quotes found for selected company</span>
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => selectedClientId && loadClientQuotes(selectedClientId)}
                    >
                      Load Quotes
                    </button>
                  </div>
                ) : (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Quote #</th>
                        <th>Status</th>
                        <th>Title</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientQuotes.map((quote) => (
                        <tr
                          key={quote.id}
                          className={`history-row ${selectedClientQuote === quote.id ? 'selected' : ''}`}
                          onClick={() => setSelectedClientQuote(quote.id)}
                        >
                          <td>{quote.quoteNumber}</td>
                          <td>
                                                     <span className={`status-badge ${quote.status.toLowerCase()}`}>
                           {quote.status === 'EMAILED' ? 'EMAIL SENT' : quote.status}
                         </span>
                          </td>
                          <td className="notes-cell" title={quote.title || quote.notes || 'No title'}>
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
                          </td>
                          <td>{quote.lastUpdated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Quote Versions</h3>
              <div className="quote-versions-container">
                {!selectedClientQuote ? (
                  <div className="quote-versions-empty">
                    <span>Select a quote from Company Quote History to view its versions</span>
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
                        <th>Status</th>
                        <th>Title</th>
                        <th>Updated</th>
                        <th>Archive</th>
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
                            <span
                              className={`status-badge ${(revision.sent_via_email || revision.status === 'EMAILED') ? 'emailed' : (quoteRevisions.indexOf(revision) === 0 ? 'current' : revision.status.toLowerCase())}`}
                              title={(revision.sent_via_email && revision.sent_at) ? `Sent on ${new Date(revision.sent_at).toLocaleDateString()}` : ''}
                            >
                              {(revision.sent_via_email || revision.status === 'EMAILED')
                                ? 'EMAIL SENT'
                                : (quoteRevisions.indexOf(revision) === 0
                                    ? 'CURRENT'
                                    : revision.status
                                  )
                              }
                            </span>
                          </td>
                          <td>{revision.title || revision.notes || '-'}</td>
                          <td>{new Date(revision.updated_at).toLocaleDateString()}</td>
                          <td>
                            <i
                              className="fa-solid fa-box-archive"
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveQuoteRevision(revision.id);
                              }}
                              style={{ cursor: 'pointer' }}
                            ></i>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="clientComments">Client Comments</label>
                <textarea
                  id="clientComments"
                  value={formData.clientComments}
                  onChange={(e) => handleInputChange('clientComments', e.target.value)}
                  rows={3}
                  placeholder="Client feedback and comments..."
                />
              </div>
            </div>

            <div className="form-section">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => handleCheckboxChange('isRecurring', e.target.checked)}
                  />
                  Recurring Amount
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="billingPeriod">Billing Period</label>
                <input
                  type="text"
                  id="billingPeriod"
                  value={formData.billingPeriod}
                  onChange={(e) => handleInputChange('billingPeriod', e.target.value)}
                  placeholder="e.g., Monthly, Quarterly"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={props.isSaving}>
            <Save size={16} />
            {props.isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="btn btn-primary" onClick={props.sendQuoteToClient} disabled={props.isSaving || (hasUnsavedChanges && !formData.sentViaEmail)}>
            <Send size={16} />
            {props.isSaving ? 'Sending...' : 'Send to Client'}
          </button>
          <button type="button" className="btn btn-secondary">
            <Archive size={16} />
            Archive
          </button>
        </div>
      </form>

      {isTaxModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit tax rate">
          <div className="modal">
            <h3>Edit Tax Rate</h3>
            <div className="form-group">
              <label htmlFor="taxRateInput">Tax Rate (%)</label>
              <input
                id="taxRateInput"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={Number.isNaN(tempTaxRatePercent) ? 0 : tempTaxRatePercent}
                onChange={(e) => setTempTaxRatePercent(parseFloat(e.target.value))}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeTaxModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={applyNewTaxRate}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Quote Modal */}
      {isNewQuoteModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create new quote">
          <div className="modal">
            <h3>Create New Quote</h3>
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
              <label htmlFor="newClientNameInput">Client Name</label>
              <div className="combo-box-container">
                <input
                  id="newClientNameInput"
                  type="text"
                  value={newQuoteData.clientName}
                  onChange={(e) => {
                    const value = e.target.value
                    updateNewQuoteData('clientName', value)
                    searchClients(value)
                  }}
                  placeholder="Type to search or enter new client name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      createNewQuote()
                    }
                  }}
                />
                {isLoadingClients && (
                  <div className="combo-box-loading">
                    <div className="loading-spinner"></div>
                  </div>
                )}
                {clientSuggestions.length > 0 && (
                  <div className="combo-box-suggestions">
                    {clientSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => {
                          updateNewQuoteData('clientName', suggestion)
                          setClientSuggestions([])
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <small className="form-help">Type to search existing clients or enter a new client name</small>
            </div>
            <div className="form-group">
              <label htmlFor="newClientEmailInput">Client Email</label>
              <input
                id="newClientEmailInput"
                type="email"
                value={newQuoteData.clientEmail}
                onChange={(e) => updateNewQuoteData('clientEmail', e.target.value)}
                placeholder="client@company.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    createNewQuote()
                  }
                }}
              />
              <small className="form-help">Enter the client's email address</small>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeNewQuoteModal} disabled={isCreatingQuote}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={createNewQuote} disabled={isCreatingQuote}>
                {isCreatingQuote ? 'Creating...' : 'Create Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Quote Modal */}
      {isViewQuoteModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Select client to view quote">
          <div className="modal">
            <h3>Select Client to View Quote</h3>
            <div className="form-group">
              <label>Available Clients</label>
              <div className="clients-list-container">
                {isLoadingAvailableClients ? (
                  <div className="clients-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading clients...</span>
                  </div>
                ) : availableClients.length === 0 ? (
                  <div className="clients-empty">
                    <span>No clients found in database</span>
                  </div>
                ) : (
                  <div className="clients-list">
                    {availableClients.map((client) => (
                      <div
                        key={client.id}
                        className={`client-item ${selectedClientId === client.id ? 'selected' : ''}`}
                        onClick={() => handleClientSelection(client.id)}
                      >
                        <div className="client-name">{client.name}</div>
                        <div className="client-email">{client.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeViewQuoteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Modal */}
      {props.isTitleModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Enter quote title">
          <div className="modal">
            <h3>Enter Quote Title</h3>
            <div className="form-group">
              <label htmlFor="quoteTitle">Title</label>
              <input
                id="quoteTitle"
                type="text"
                maxLength={100}
                placeholder="Enter a short title for this quote revision (max 100 characters)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const title = (e.target as HTMLInputElement).value.trim()
                    if (title) {
                      props.submitTitleAndCompleteSave(title)
                    }
                  }
                }}
              />
              <small className="form-help">This title will be saved with the quote revision</small>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={props.closeTitleModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const title = (document.getElementById('quoteTitle') as HTMLInputElement)?.value.trim()
                  if (title) {
                    props.submitTitleAndCompleteSave(title)
                  }
                }}
              >
                Save Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuoteFormView

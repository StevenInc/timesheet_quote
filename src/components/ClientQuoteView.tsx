import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { QuoteViewService } from '../lib/quoteViewService'
import type { DatabaseQuoteRevision } from './quote-form/types'
import './QuoteForm.css'

interface ClientQuoteViewProps {
  revisionId: string
}

// Use the existing DatabaseQuoteRevision type since it already has the structure we need
type QuoteData = DatabaseQuoteRevision

export const ClientQuoteView: React.FC<ClientQuoteViewProps> = ({ revisionId }) => {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTracked, setViewTracked] = useState(false)

  useEffect(() => {
    const loadQuoteData = async () => {
      try {
        setLoading(true)

        // Load quote revision data
        const { data: revision, error: revisionError } = await supabase
          .from('quote_revisions')
          .select(`
            *,
            quotes!inner(
              quote_number,
              clients!inner(name, email)
            ),
            quote_items!inner(
              description,
              quantity,
              unit_price,
              total,
              recurring
            ),
            payment_terms!inner(
              percentage,
              description
            )
          `)
          .eq('id', revisionId)
          .single()

        if (revisionError) throw revisionError

        setQuoteData(revision as QuoteData)

        // Automatically track the view
        if (!viewTracked) {
          try {
            await QuoteViewService.trackQuoteView(revisionId)
            setViewTracked(true)
            console.log('Quote view tracked successfully')
          } catch (trackError) {
            console.error('Failed to track quote view:', trackError)
            // Don't fail the quote display if tracking fails
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quote')
      } finally {
        setLoading(false)
      }
    }

    if (revisionId) {
      loadQuoteData()
    }
  }, [revisionId, viewTracked])

  if (loading) {
    return (
      <div className="client-quote-container">
        <div className="loading">Loading quote...</div>
      </div>
    )
  }

  if (error || !quoteData) {
    return (
      <div className="client-quote-container">
        <div className="error">Error: {error || 'Quote not found'}</div>
      </div>
    )
  }

  // The database returns the data in a nested structure, so we need to access it correctly
  const safeItems = quoteData.quote_items || []
  const safePaymentTerms = quoteData.payment_terms || []
  const revision = quoteData
  const quote = quoteData.quotes

  const subtotal = safeItems.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = revision.is_tax_enabled ? subtotal * (revision.tax_rate / 100) : 0
  const total = subtotal + taxAmount

  return (
    <div className="client-quote-container">
      <div className="quote-header">
        <h1>Quote #{quote?.quote_number || 'Unknown'}</h1>
        <div className="client-info">
          <p><strong>Client:</strong> {quote?.clients?.name || 'Unknown'}</p>
          <p><strong>Email:</strong> {quote?.clients?.email || 'Unknown'}</p>
        </div>
        <div className="quote-meta">
          <p><strong>Revision:</strong> v{revision?.revision_number || 'Unknown'}</p>
          <p><strong>Date:</strong> {revision?.created_at ? new Date(revision.created_at).toLocaleDateString() : 'Unknown'}</p>
          {revision?.expires_on && (
            <p><strong>Expires:</strong> {new Date(revision.expires_on).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {revision?.title && (
        <div className="quote-title">
          <h2>{revision.title}</h2>
        </div>
      )}

      {revision?.notes && (
        <div className="quote-notes">
          <p>{revision.notes}</p>
        </div>
      )}

      <div className="quote-items">
        <h3>Items</h3>
        <table className="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Recurring</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.map((item, index) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td>{!item.recurring || item.recurring === 'none' ? 'No' : item.recurring}</td>
                <td>{item.quantity}</td>
                <td>${item.unit_price.toFixed(2)}</td>
                <td>${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="quote-summary">
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {revision?.is_tax_enabled && (
          <div className="summary-row">
            <span>Tax ({revision?.tax_rate || 0}%):</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="summary-row total">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {safePaymentTerms.length > 0 && (
        <div className="payment-terms">
          <h3>Payment Terms</h3>
          <ul>
            {safePaymentTerms.map((term, index) => (
              <li key={index}>
                {term.percentage}% - {term.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {revision?.is_recurring && (
        <div className="recurring-info">
          <h3>Recurring Service</h3>
          <p>
            <strong>Amount:</strong> ${revision?.recurring_amount?.toFixed(2) || '0.00'}
            {revision?.billing_period && (
              <span> <strong>Billing:</strong> {revision.billing_period}
            </span>
            )}
          </p>
        </div>
      )}

      <div className="quote-footer">
        <p>Thank you for your business!</p>
        <p>This quote is valid until {revision.expires_on ? new Date(revision.expires_on).toLocaleDateString() : 'further notice'}.</p>
      </div>
    </div>
  )
}

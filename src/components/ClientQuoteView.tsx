import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { QuoteViewService } from '../lib/quoteViewService'
import type { DatabaseQuoteRevision } from './quote-form/types'
import './QuoteForm.css'

interface ClientQuoteViewProps {
  revisionId: string
}

interface QuoteData {
  revision: DatabaseQuoteRevision
  quote: {
    quote_number: string
    clients: {
      name: string
      email: string
    }
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    total: number
    recurring: boolean
  }>
  payment_terms: Array<{
    percentage: number
    description: string
  }>
}

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

  const { revision, quote, items, payment_terms } = quoteData
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = revision.is_tax_enabled ? subtotal * (revision.tax_rate / 100) : 0
  const total = subtotal + taxAmount

  return (
    <div className="client-quote-container">
      <div className="quote-header">
        <h1>Quote #{quote.quote_number}</h1>
        <div className="client-info">
          <p><strong>Client:</strong> {quote.clients.name}</p>
          <p><strong>Email:</strong> {quote.clients.email}</p>
        </div>
        <div className="quote-meta">
          <p><strong>Revision:</strong> v{revision.revision_number}</p>
          <p><strong>Date:</strong> {new Date(revision.created_at).toLocaleDateString()}</p>
          {revision.expires_on && (
            <p><strong>Expires:</strong> {new Date(revision.expires_on).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {revision.title && (
        <div className="quote-title">
          <h2>{revision.title}</h2>
        </div>
      )}

      {revision.notes && (
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
            {items.map((item, index) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td>{item.recurring === false || item.recurring === 'none' ? 'No' : item.recurring}</td>
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
        {revision.is_tax_enabled && (
          <div className="summary-row">
            <span>Tax ({revision.tax_rate}%):</span>
            <span>${taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="summary-row total">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      {payment_terms.length > 0 && (
        <div className="payment-terms">
          <h3>Payment Terms</h3>
          <ul>
            {payment_terms.map((term, index) => (
              <li key={index}>
                {term.percentage}% - {term.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {revision.is_recurring && (
        <div className="recurring-info">
          <h3>Recurring Service</h3>
          <p>
            <strong>Amount:</strong> ${revision.recurring_amount?.toFixed(2)}
            {revision.billing_period && (
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

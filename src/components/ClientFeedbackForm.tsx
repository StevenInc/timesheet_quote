import React, { useState } from 'react'
import type { ClientFeedbackFormData } from './quote-form/types'
import './QuoteForm.css'

interface ClientFeedbackFormProps {
  clientEmail: string
  onSubmit: (feedback: ClientFeedbackFormData) => Promise<void>
  isSubmitting?: boolean
}

export const ClientFeedbackForm: React.FC<ClientFeedbackFormProps> = ({
  clientEmail,
  onSubmit,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<ClientFeedbackFormData>({
    clientEmail,
    action: 'ACCEPT',
    comment: ''
  })

  const handleInputChange = (field: keyof ClientFeedbackFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Don't submit if comment is empty (following workspace rule)
    if (formData.comment.trim() === '') {
      return
    }

    await onSubmit(formData)

    // Reset form after successful submission
    setFormData(prev => ({
      ...prev,
      comment: ''
    }))
  }

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'ACCEPT':
        return 'Accept this quote and proceed with the project'
      case 'DECLINE':
        return 'Decline this quote - no further action needed'
      case 'REQUEST_REVISION':
        return 'Request changes to this quote before making a decision'
      default:
        return ''
    }
  }

  return (
    <div className="client-feedback-form">
      <h3>Quote Feedback</h3>
      <p className="feedback-description">
        Please let us know your decision on this quote or request any changes needed.
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-group">
          <label htmlFor="clientEmail">Your Email</label>
          <input
            id="clientEmail"
            type="email"
            value={formData.clientEmail}
            onChange={(e) => handleInputChange('clientEmail', e.target.value)}
            placeholder="your.email@company.com"
            required
          />
          <small className="form-help">
            We'll use this email to confirm your feedback and follow up if needed.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="action">What would you like to do?</label>
          <select
            id="action"
            value={formData.action}
            onChange={(e) => handleInputChange('action', e.target.value as any)}
            required
          >
            <option value="ACCEPT">Accept Quote</option>
            <option value="DECLINE">Decline Quote</option>
            <option value="REQUEST_REVISION">Request Revision</option>
          </select>
          <small className="form-help">
            {getActionDescription(formData.action)}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="comment">Additional Comments</label>
          <textarea
            id="comment"
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            rows={4}
            placeholder={
              formData.action === 'ACCEPT'
                ? 'Any specific requirements or questions about getting started...'
                : formData.action === 'DECLINE'
                ? 'Reason for declining (optional but helpful)...'
                : 'Please describe the changes you need...'
            }
            required
          />
          <small className="form-help">
            {formData.action === 'ACCEPT' && 'Let us know if you have any questions or specific requirements.'}
            {formData.action === 'DECLINE' && 'Your feedback helps us improve our quotes for future projects.'}
            {formData.action === 'REQUEST_REVISION' && 'Be as specific as possible about what changes you need.'}
          </small>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !formData.comment.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ClientFeedbackForm

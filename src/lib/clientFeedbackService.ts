import { supabase } from './supabaseClient'
import type { ClientFeedbackSubmission, ClientFeedback } from '../components/quote-form/types'

export class ClientFeedbackService {
  /**
   * Submit client feedback for a quote
   */
  static async submitFeedback(feedback: ClientFeedbackSubmission): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .insert({
          quote_id: feedback.quoteId,
          quote_revision_id: feedback.quoteRevisionId,
          client_email: feedback.clientEmail,
          action: feedback.action,
          comment: feedback.comment || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error submitting client feedback:', error)
        return { success: false, error: error.message }
      }

      console.log('Client feedback submitted successfully:', data)
      return { success: true }
    } catch (err) {
      console.error('Unexpected error submitting client feedback:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get all feedback for a specific quote
   */
  static async getQuoteFeedback(quoteId: string): Promise<{ data: ClientFeedback[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching quote feedback:', error)
        return { data: null, error: error.message }
      }

      // Transform the data to match our interface
      const transformedData: ClientFeedback[] = data.map(item => ({
        id: item.id,
        quoteId: item.quote_id,
        quoteRevisionId: item.quote_revision_id,
        clientEmail: item.client_email,
        action: item.action,
        comment: item.comment,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))

      return { data: transformedData }
    } catch (err) {
      console.error('Unexpected error fetching quote feedback:', err)
      return {
        data: null,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get all feedback for a specific quote revision
   */
  static async getRevisionFeedback(revisionId: string): Promise<{ data: ClientFeedback[] | null; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('quote_revision_id', revisionId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching revision feedback:', error)
        return { data: null, error: error.message }
      }

      // Transform the data to match our interface
      const transformedData: ClientFeedback[] = data.map(item => ({
        id: item.id,
        quoteId: item.quote_id,
        quoteRevisionId: item.quote_revision_id,
        clientEmail: item.client_email,
        action: item.action,
        comment: item.comment,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))

      return { data: transformedData }
    } catch (err) {
      console.error('Unexpected error fetching revision feedback:', err)
      return {
        data: null,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      }
    }
  }

  /**
   * Check if a client has already provided feedback for a specific revision
   */
  static async hasClientFeedback(revisionId: string, clientEmail: string): Promise<{ hasFeedback: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('client_comments')
        .select('id')
        .eq('quote_revision_id', revisionId)
        .eq('client_email', clientEmail)
        .limit(1)

      if (error) {
        console.error('Error checking client feedback:', error)
        return { hasFeedback: false, error: error.message }
      }

      return { hasFeedback: data.length > 0 }
    } catch (err) {
      console.error('Unexpected error checking client feedback:', err)
      return {
        hasFeedback: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      }
    }
  }
}

import { supabase } from './supabaseClient'

/**
 * Service for tracking quote views when clients access quote URLs
 */
export class QuoteViewService {
  /**
   * Track that a quote revision has been viewed by a client
   * This should be called when a client accesses the quote URL
   */
  static async trackQuoteView(revisionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('track-quote-view', {
        body: { revisionId }
      })

      if (error) {
        console.error('Error tracking quote view:', error)
        return false
      }

      return data?.success || false
    } catch (error) {
      console.error('Unexpected error tracking quote view:', error)
      return false
    }
  }

  /**
   * Alternative method using direct RPC call if Edge Function is not available
   */
  static async trackQuoteViewDirect(revisionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_quote_revision_as_viewed', {
        revision_id: revisionId
      })

      if (error) {
        console.error('Error marking quote revision as viewed:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Unexpected error marking quote as viewed:', error)
      return false
    }
  }
}

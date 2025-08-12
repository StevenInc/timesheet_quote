import { supabase } from './supabaseClient'

export interface EmailData {
  quoteId: string
  clientEmail: string
  clientName: string
  quoteNumber: string
  quoteUrl: string
  total: number
  expires: string
}

export class EmailService {
  private static instance: EmailService

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendQuoteEmail(emailData: EmailData): Promise<void> {
    try {
      console.log('📧 Sending quote email via Supabase Edge Function...')

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('resend-email', {
        body: emailData
      })

      if (error) {
        console.error('❌ Edge function error:', error)
        throw new Error(`Email sending failed: ${error.message}`)
      }

      if (!data?.success) {
        throw new Error('Email function returned unsuccessful response')
      }

      console.log('✅ Email queued successfully:', data)

    } catch (error) {
      console.error('❌ Email service error:', error)
      throw error
    }
  }
}
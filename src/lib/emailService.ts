interface EmailData {
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

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendQuoteEmail(emailData: EmailData): Promise<void> {
    console.log('🚀 EmailService.sendQuoteEmail called with:', emailData)

    // For now, we'll use a mock implementation
    // In production, this would integrate with a real email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Or Supabase's built-in email functionality

    console.log('Sending quote email:', emailData)

    // Simulate email sending delay
    console.log('⏳ Simulating email sending delay...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock success - in real implementation, this would return the email service response
    console.log(`✅ Quote email sent successfully to ${emailData.clientEmail}`)

    // For development/testing, you could also:
    // 1. Open the user's default email client with a pre-filled email
    // 2. Show a success message
    // 3. Log the email details for debugging
  }

  // Alternative implementation that opens the user's default email client
  async openEmailClient(emailData: EmailData): Promise<void> {
    const subject = `Quote ${emailData.quoteNumber} - ${emailData.clientName}`
    const body = `Dear ${emailData.clientName},

Thank you for your interest in our services. Please find attached our quote ${emailData.quoteNumber}.

Quote Details:
- Quote Number: ${emailData.quoteNumber}
- Total Amount: $${emailData.total.toFixed(2)}
- Expires: ${emailData.expires}
- View Online: ${emailData.quoteUrl}

Please review the quote and let us know if you have any questions.

Best regards,
Your Company Name`

    const mailtoLink = `mailto:${emailData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    // Open the user's default email client
    window.open(mailtoLink, '_blank')
  }
}

export default EmailService

# Email Feature Implementation

## Overview
The "Send to Client" feature has been implemented to allow users to email quotes directly to clients. Currently, it uses a mock email service that can be easily replaced with a real email service.

## How It Works

### Current Implementation
1. **Mock Email Service**: Located in `src/lib/emailService.ts`
   - Simulates email sending with a 1-second delay
   - Logs email details to the console
   - Can be easily replaced with real email service integration

2. **Quote Status Tracking**:
   - Updates quote status to "EMAILED" in the database
   - Records timestamp and notes in `quote_status_history` table

3. **User Experience**:
   - Button shows "Sending..." while processing
   - Success/error messages are displayed
   - Plays an audible success tone when completed

### Integration Points

#### Frontend
- **Button**: Located in `QuoteFormView.tsx` around line 704
- **Function**: `sendQuoteToClient()` in `useQuoteForm.ts`
- **Email Service**: `EmailService` class in `src/lib/emailService.ts`

#### Backend
- **Database**: Uses existing `quote_status_history` table
- **Status**: Updates to "EMAILED" status
- **Audit Trail**: Records when and how the quote was sent

## Replacing Mock Email Service

### Option 1: Supabase Edge Functions
Create a Supabase Edge Function for email sending:

```typescript
// supabase/functions/send-quote-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { quoteId, clientEmail, clientName, quoteNumber, quoteUrl, total, expires } = await req.json()

  // Integrate with your preferred email service:
  // - SendGrid
  // - Mailgun
  // - AWS SES
  // - Resend
  // - Or use Supabase's built-in email functionality

  // Example with SendGrid:
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: clientEmail }] }],
      from: { email: 'noreply@yourcompany.com' },
      subject: `Quote ${quoteNumber} - ${clientName}`,
      content: [{
        type: 'text/html',
        value: generateQuoteEmailHTML(clientName, quoteNumber, total, expires, quoteUrl)
      }]
    })
  })

  if (!response.ok) {
    throw new Error(`Email sending failed: ${response.statusText}`)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### Option 2: Direct Email Service Integration
Replace the mock service with direct integration:

```typescript
// src/lib/emailService.ts
import { Resend } from 'resend'

export class EmailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  async sendQuoteEmail(emailData: EmailData): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: 'noreply@yourcompany.com',
      to: [emailData.clientEmail],
      subject: `Quote ${emailData.quoteNumber} - ${emailData.clientName}`,
      html: this.generateQuoteEmailHTML(emailData)
    })

    if (error) {
      throw new Error(`Email sending failed: ${error.message}`)
    }

    console.log('Email sent successfully:', data)
  }

  private generateQuoteEmailHTML(emailData: EmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quote ${emailData.quoteNumber}</title>
        </head>
        <body>
          <h1>Quote ${emailData.quoteNumber}</h1>
          <p>Dear ${emailData.clientName},</p>
          <p>Thank you for your interest in our services. Please find attached our quote ${emailData.quoteNumber}.</p>
          <h2>Quote Details:</h2>
          <ul>
            <li><strong>Quote Number:</strong> ${emailData.quoteNumber}</li>
            <li><strong>Total Amount:</strong> $${emailData.total.toFixed(2)}</li>
            <li><strong>Expires:</strong> ${emailData.expires}</li>
            <li><strong>View Online:</strong> <a href="${emailData.quoteUrl}">${emailData.quoteUrl}</a></li>
          </ul>
          <p>Please review the quote and let us know if you have any questions.</p>
          <p>Best regards,<br>Your Company Name</p>
        </body>
      </html>
    `
  }
}
```

### Option 3: Use Supabase's Built-in Email
If you have Supabase's email service configured:

```typescript
// In useQuoteForm.ts, replace the EmailService call with:
const { error: emailError } = await supabase.auth.admin.sendRawEmail({
  to: formData.clientEmail,
  subject: `Quote ${formData.quoteNumber} - ${formData.clientName}`,
  html: generateQuoteEmailHTML(formData)
})
```

## Environment Variables
Add these to your `.env` file:

```bash
# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# For Resend
RESEND_API_KEY=your_resend_api_key

# For Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com
```

## Testing
1. Fill out a quote form with a client email
2. Click "Send to Client"
3. Check the browser console for email details
4. Verify the quote status is updated to "EMAILED"
5. Check the `quote_status_history` table in your database

## Security Considerations
- Validate email addresses before sending
- Rate limit email sending to prevent abuse
- Use environment variables for API keys
- Consider implementing email templates with proper sanitization
- Add logging for audit purposes

## Future Enhancements
- Email templates with customizable branding
- PDF quote attachments
- Email tracking and delivery confirmation
- Bulk quote sending
- Email scheduling
- Client email preferences management

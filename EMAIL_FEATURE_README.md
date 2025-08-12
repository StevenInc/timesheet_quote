# Email Feature Implementation

## Overview
The "Send to Client" feature has been implemented to allow users to email quotes directly to clients. The system now uses a comprehensive approach that tracks email status at both the quote level and individual revision level.

## Current Implementation Status

### ✅ **What's Already Working**
1. **Email Status Tracking**:
   - `sent_via_email` field in `quote_revisions` table
   - `sent_at` timestamp for when email was sent
   - Quote status updates to "EMAILED" when sent

2. **UI Integration**:
   - "Send to Client" button in QuoteFormView
   - Status badges show "EMAIL SENT" for sent quotes
   - Company Quote History displays email status correctly
   - Quote Versions table shows which revisions were sent

3. **Database Schema**:
   - `quote_revisions.sent_via_email` (boolean)
   - `quote_revisions.sent_at` (timestamp)
   - `quote_status_history` table for audit trail

### 🔄 **What Needs Implementation**
1. **Actual Email Service**: Currently using mock service
2. **Email Templates**: HTML email generation
3. **Email Configuration**: SMTP/API setup

## How It Currently Works

### Frontend Flow
1. **User clicks "Send to Client"** → `sendQuoteToClient()` function
2. **Quote is saved** → `saveQuoteForEmail()` called first
3. **Email service called** → Currently mock service
4. **Database updated** → `sent_via_email: true`, `sent_at: timestamp`
5. **UI refreshed** → Status badges update to show "EMAIL SENT"

### Database Updates
```sql
-- When email is sent, these fields are updated:
UPDATE quote_revisions
SET sent_via_email = true,
    sent_at = NOW()
WHERE id = [revision_id];
```

## Implementation Options

### Option 1: Supabase Edge Functions (Recommended)
Create a Supabase Edge Function for email sending:

```typescript
// supabase/functions/send-quote-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { quoteId, clientEmail, clientName, quoteNumber, quoteUrl, total, expires } = await req.json()

  // Validate input
  if (!clientEmail || !clientName || !quoteNumber) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

function generateQuoteEmailHTML(clientName: string, quoteNumber: string, total: number, expires: string, quoteUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quote ${quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 5px; }
          .details { margin: 20px 0; }
          .cta { background: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; }
          .cta a { color: white; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Quote ${quoteNumber}</h1>
          <p>Dear ${clientName},</p>
        </div>

        <div class="details">
          <p>Thank you for your interest in our services. Please find attached our quote ${quoteNumber}.</p>

          <h2>Quote Details:</h2>
          <ul>
            <li><strong>Quote Number:</strong> ${quoteNumber}</li>
            <li><strong>Total Amount:</strong> $${total.toFixed(2)}</li>
            <li><strong>Expires:</strong> ${expires}</li>
          </ul>
        </div>

        <div class="cta">
          <a href="${quoteUrl}">View Quote Online</a>
        </div>

        <p>Please review the quote and let us know if you have any questions.</p>
        <p>Best regards,<br>Your Company Name</p>
      </body>
    </html>
  `
}
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
    // Same HTML generation as above
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

## Integration Steps

### 1. Update EmailService.ts
Replace the mock implementation with real email service:

```typescript
// src/lib/emailService.ts
export class EmailService {
  private static instance: EmailService
  private emailProvider: EmailProvider // Your chosen provider

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async sendQuoteEmail(emailData: EmailData): Promise<void> {
    try {
      // Call your email service here
      await this.emailProvider.send(emailData)

      console.log('✅ Email sent successfully to:', emailData.clientEmail)
    } catch (error) {
      console.error('❌ Email sending failed:', error)
      throw error
    }
  }
}
```

### 2. Update useQuoteForm.ts
Modify the `sendQuoteToClient` function to call the real email service:

```typescript
// In sendQuoteToClient function, replace the mock service call:
const emailService = EmailService.getInstance()
await emailService.sendQuoteEmail({
  quoteId: savedQuote.quoteId,
  clientEmail: formData.clientEmail,
  clientName: formData.clientName,
  quoteNumber: formData.quoteNumber,
  quoteUrl: formData.quoteUrl,
  total: formData.total,
  expires: formData.expires
})
```

### 3. Environment Variables
Add these to your `.env` file:

```bash
# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# For Resend
RESEND_API_KEY=your_resend_api_key

# For Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com

# For Supabase Edge Functions
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Implementation

### 1. Test Email Sending
1. Fill out a quote form with a valid client email
2. Click "Send to Client"
3. Check browser console for email service logs
4. Verify email is received by the client

### 2. Test Status Updates
1. After sending email, check that:
   - Quote status shows "EMAIL SENT" in Company Quote History
   - Specific revision shows "EMAIL SENT" in Quote Versions table
   - `sent_via_email` is `true` in database
   - `sent_at` timestamp is recorded

### 3. Test Error Handling
1. Try sending with invalid email address
2. Test with email service down
3. Verify error messages are displayed to user

## Security Considerations

- **Email Validation**: Validate email addresses before sending
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **API Keys**: Use environment variables for all API keys
- **Input Sanitization**: Sanitize all user inputs before email generation
- **Audit Logging**: Log all email attempts for security monitoring
- **Email Templates**: Use safe HTML templates to prevent XSS

## Future Enhancements

- **Email Templates**: Customizable branding and styling
- **PDF Attachments**: Automatically attach quote PDFs
- **Email Tracking**: Delivery confirmation and open tracking
- **Bulk Sending**: Send multiple quotes at once
- **Email Scheduling**: Schedule emails for later delivery
- **Client Preferences**: Allow clients to set email preferences
- **Template Management**: Admin interface for email templates
- **Analytics**: Track email performance and engagement

## Troubleshooting

### Common Issues
1. **Email not sending**: Check API keys and service configuration
2. **Status not updating**: Verify database permissions and table structure
3. **UI not refreshing**: Check that `loadClientQuotes` and `loadQuoteRevisions` are called
4. **Error messages**: Check browser console and network tab for details

### Debug Steps
1. Enable console logging in email service
2. Check Supabase logs for database errors
3. Verify environment variables are loaded
4. Test email service independently
5. Check network requests in browser dev tools

## Support

For implementation help or issues:
1. Check the browser console for error messages
2. Verify all environment variables are set
3. Test email service credentials independently
4. Check Supabase Edge Function logs if using that approach

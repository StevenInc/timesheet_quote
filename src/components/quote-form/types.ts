export interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface PaymentTermItem {
  id: string
  percentage: number
  description: string
}

export interface QuoteRevision {
  id: string
  quoteId: string
  revisionNumber: number
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  expiresOn?: string
  taxRate: number
  isTaxEnabled: boolean
  notes: string
  isRecurring: boolean
  billingPeriod?: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  recurringAmount?: number
  createdAt: string
  updatedAt: string
}

export interface QuoteHistory {
  id: string
  quoteId: string
  quoteNumber: string
  versionNumber: number
  date: string
  isCurrent: boolean
  notes: string
  clientName: string
  status: string
  version: string // e.g., "v1", "v2"
}

export interface QuoteFormData {
  owner: string
  clientName: string
  clientEmail: string
  quoteNumber: string
  quoteUrl: string
  expires: string
  taxRate: number
  isTaxEnabled: boolean
  paymentTerms: string
  items: QuoteItem[]
  subtotal: number
  tax: number
  total: number
  notes: string
  legalTerms: string
  clientComments: string
  isRecurring: boolean
  billingPeriod: string
  recurringAmount: number
  paymentSchedule: PaymentTermItem[]
  quoteHistory: QuoteHistory[]
  selectedHistoryVersion: string
}

export interface NewQuoteModalData {
  quoteNumber: string
  clientName: string
}

// Database response types for Supabase queries
export interface DatabaseQuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface DatabasePaymentTerm {
  id: string
  percentage: number
  description: string
}

export interface DatabaseLegalTerm {
  id: string
  terms: string
}

export interface DatabaseClientComment {
  id: string
  comment: string
}

export interface DatabaseQuoteRevision {
  id: string
  revision_number: number
  status: string
  expires_on: string
  tax_rate: number
  is_tax_enabled: boolean
  notes: string
  is_recurring: boolean
  billing_period: string
  recurring_amount: number
  quote_items?: DatabaseQuoteItem[]
  payment_terms?: DatabasePaymentTerm[]
  legal_terms?: DatabaseLegalTerm[]
  client_comments?: DatabaseClientComment[]
}

export interface DatabaseClient {
  id: string
  name: string
  email: string
}

export interface DatabaseQuote {
  id: string
  quote_number: string
  clients: DatabaseClient
  quote_revisions: DatabaseQuoteRevision[]
}

export interface ClientQuote {
  id: string
  quoteNumber: string
  status: string
  createdAt: string
  updatedAt: string
  latestRevisionNumber: number
  totalRevisions: number
  notes: string
}

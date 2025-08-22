export interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  recurring: string | false
  taxable: boolean
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
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  expiresOn?: string
  taxRate: number
  isTaxEnabled: boolean
  title: string
  notes: string
  isRecurring: boolean
  billingPeriod?: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually'
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
  ownerName?: string
  creatorName?: string
  createdAt?: string
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
  title: string
  notes: string
  legalTerms: string
  clientComments: string
  isRecurring: boolean
  billingPeriod: string
  recurringAmount: number
  paymentSchedule: PaymentTermItem[]
  quoteHistory: QuoteHistory[]
  selectedHistoryVersion: string
  sentViaEmail?: boolean
  defaultLegalTerms?: string
}

export interface NewQuoteModalData {
  quoteNumber: string
  selectedClientId: string
}

// Database response types for Supabase queries
export interface DatabaseQuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  recurring: string | false
  taxable: boolean
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

export interface DefaultLegalTerms {
  id: string
  owner_id: string
  terms: string
  created_at: string
  updated_at: string
}

export interface DatabaseQuoteRevision {
  id: string
  quote_id: string
  revision_number: number
  status: string
  expires_on: string
  tax_rate: number
  is_tax_enabled: boolean
  title: string
  notes: string
  is_recurring: boolean
  billing_period: string
  recurring_amount: number
  created_at: string
  updated_at: string
  sent_via_email?: boolean
  sent_at?: string
  viewed_at?: string
  currentQuoteStatus?: string
  quote_items?: DatabaseQuoteItem[]
  payment_terms?: DatabasePaymentTerm[]
  legal_terms?: DatabaseLegalTerm[]
  quotes?: {
    quote_number: string
    owner_id?: string
    created_at?: string
    clients?: {
      name: string
      email: string
    }
  }
}

export interface DatabaseClient {
  id: string
  name: string
  email: string
}

export interface ClientSuggestion {
  id: string
  name: string
  email: string
}

export interface DatabaseOwner {
  id: string
  name: string
  email?: string
  role?: string
}

export interface DatabaseQuote {
  id: string
  quote_number: string
  owner_id: string
  created_at: string
  clients: DatabaseClient
  owners?: DatabaseOwner
  quote_revisions: DatabaseQuoteRevision[]
}

export interface ClientQuote {
  id: string
  quoteNumber: string
  status?: string
  createdAt: string
  updatedAt: string
  latestRevisionNumber: number
  totalRevisions: number
  title: string
  notes: string
  lastUpdated: string
  creatorName?: string
  ownerId?: string
  expirationDate?: string
  // New fields for tracking sent/viewed information
  lastSentAt?: string
  lastViewedAt?: string
  lastSentViaEmail?: boolean
  lastSentRevisionNumber?: number
  lastViewedRevisionNumber?: number
}

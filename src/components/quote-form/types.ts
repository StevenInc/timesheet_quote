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

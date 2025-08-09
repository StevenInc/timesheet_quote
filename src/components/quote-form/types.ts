export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteHistory {
  id: string;
  version: string;
  date: string;
  isCurrent: boolean;
}

export interface PaymentTermItem {
  id: string;
  percentage: number;
  description: string;
}

export interface QuoteFormData {
  owner: string;
  clientName: string;
  clientEmail: string;
  quoteUrl: string;
  expires: string;
  paymentTerms: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  legalese: string;
  clientComments: string;
  isAccepted: boolean;
  isDeclined: boolean;
  isRecurring: boolean;
  billingPeriod: string;
  quoteHistory: QuoteHistory[];
  selectedHistoryVersion: string;
  isTaxEnabled: boolean;
  taxRate: number;
  paymentSchedule: PaymentTermItem[];
}

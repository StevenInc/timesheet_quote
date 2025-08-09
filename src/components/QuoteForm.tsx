import React, { useState } from 'react';
import { Trash2, Save, Send, Archive, Copy, Download } from 'lucide-react';
import './QuoteForm.css';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteHistory {
  id: string;
  version: string;
  date: string;
  isCurrent: boolean;
}

interface PaymentTermItem {
  id: string;
  percentage: number;
  description: string;
}

interface QuoteFormData {
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
  taxRate: number; // 0.08 = 8%
  paymentSchedule: PaymentTermItem[];
}

const QuoteForm: React.FC = () => {
  const [formData, setFormData] = useState<QuoteFormData>({
    owner: '',
    clientName: '',
    clientEmail: '',
    quoteUrl: 'https://quotes.timesheets.com/68124-AJ322ADV3',
    expires: '2025-07-08',
    paymentTerms: 'Net 30',
    items: [
      {
        id: '1',
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: '',
    legalese: '',
    clientComments: '',
    isAccepted: false,
    isDeclined: false,
    isRecurring: false,
    billingPeriod: '',
    quoteHistory: [
      { id: '1', version: 'Current Version', date: '', isCurrent: true },
      { id: '2', version: '03 - 07/08/25', date: '2025-07-08', isCurrent: false },
      { id: '3', version: '02 - 07/08/25', date: '2025-07-08', isCurrent: false },
      { id: '4', version: '01 - 07/03/25', date: '2025-07-03', isCurrent: false },
    ],
    selectedHistoryVersion: '2',
    isTaxEnabled: false,
    taxRate: 0.08,
    paymentSchedule: [
      { id: 'ps-1', percentage: 100, description: 'net 30 days' },
    ],
  });

  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [tempTaxRatePercent, setTempTaxRatePercent] = useState<number>(formData.taxRate * 100);

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const recalc = (
    items: QuoteItem[] = formData.items,
    isTaxEnabled: boolean = formData.isTaxEnabled,
    taxRate: number = formData.taxRate
  ) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = isTaxEnabled ? subtotal * taxRate : 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    const updatedItems = formData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = calculateItemTotal(updatedItem.quantity, updatedItem.unitPrice);
        }
        return updatedItem;
      }
      return item;
    });

    const { subtotal, tax, total } = recalc(updatedItems);

    setFormData({
      ...formData,
      items: updatedItems,
      subtotal,
      tax,
      total,
    });
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const removeItem = (id: string) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter(item => item.id !== id);
      const { subtotal, tax, total } = recalc(updatedItems);

      setFormData({
        ...formData,
        items: updatedItems,
        subtotal,
        tax,
        total,
      });
    }
  };

  const handleInputChange = (field: keyof QuoteFormData, value: string | number | boolean) => {
    const next = { ...formData, [field]: value } as QuoteFormData;
    if (field === 'taxRate' || field === 'isTaxEnabled') {
      const { subtotal, tax, total } = recalc(next.items, next.isTaxEnabled, next.taxRate);
      next.subtotal = subtotal;
      next.tax = tax;
      next.total = total;
    }
    setFormData(next);
  };

  const handleCheckboxChange = (field: keyof QuoteFormData, value: boolean) => {
    if (field === 'isTaxEnabled') {
      const { subtotal, tax, total } = recalc(formData.items, value, formData.taxRate);
      setFormData({
        ...formData,
        isTaxEnabled: value,
        subtotal,
        tax,
        total,
      });
      if (value) {
        setTempTaxRatePercent(formData.taxRate * 100);
        setIsTaxModalOpen(true);
      }
      return;
    }

    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // Payment schedule helpers
  const updatePaymentTerm = (id: string, field: keyof PaymentTermItem, value: string | number) => {
    const updated = formData.paymentSchedule.map((t) =>
      t.id === id ? { ...t, [field]: field === 'percentage' ? Number(value) : value } : t
    );
    setFormData({ ...formData, paymentSchedule: updated });
  };

  const addPaymentTerm = () => {
    const newTerm: PaymentTermItem = { id: `ps-${Date.now()}`, percentage: 0, description: '' };
    setFormData({ ...formData, paymentSchedule: [...formData.paymentSchedule, newTerm] });
  };

  const removePaymentTerm = (id: string) => {
    setFormData({ ...formData, paymentSchedule: formData.paymentSchedule.filter((t) => t.id !== id) });
  };

  const paymentScheduleTotal = formData.paymentSchedule.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Quote Data:', formData);
    // TODO: Save to Supabase
  };

  const copyQuoteUrl = () => {
    navigator.clipboard.writeText(formData.quoteUrl);
    // TODO: Show toast notification
  };

  const downloadQuote = () => {
    // TODO: Implement PDF generation
    console.log('Downloading quote...');
  };

  const applyNewTaxRate = () => {
    const newRate = Math.max(0, Math.min(100, Number(tempTaxRatePercent))) / 100;
    const { subtotal, tax, total } = recalc(formData.items, formData.isTaxEnabled, newRate);
    setFormData({
      ...formData,
      taxRate: newRate,
      subtotal,
      tax,
      total,
    });
    setIsTaxModalOpen(false);
  };

  return (
    <div className="quote-form-container">
      {/* Header */}
      <div className="quote-form-header">
        <div className="header-left">
          <h1>Add or Edit a Quote</h1>
          <div className="quote-url-section">
            <span className="quote-url">{formData.quoteUrl}</span>
            <button type="button" className="btn btn-icon" onClick={copyQuoteUrl}>
              <Copy size={16} />
            </button>
            <button type="button" className="btn btn-icon" onClick={downloadQuote}>
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="quote-form">
        <div className="form-content">
          {/* Left Column */}
          <div className="form-column left-column">
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="owner">Owner</label>
                <select
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => handleInputChange('owner', e.target.value)}
                >
                  <option value="">-- Select One --</option>
                  <option value="owner1">Owner 1</option>
                  <option value="owner2">Owner 2</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="clientName">Client Name</label>
                <input
                  type="text"
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientEmail">Email Address</label>
                <input
                  type="email"
                  id="clientEmail"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Quote Items */}
            <div className="form-section">
              <h2>Quote Items</h2>
              <div className="items-table">
                <div className="table-header">
                  <div className="header-cell">Description</div>
                  <div className="header-cell">Quantity</div>
                  <div className="header-cell">Unit Price</div>
                  <div className="header-cell">Item Total</div>
                  <div className="header-cell" aria-hidden="true"></div>
                </div>

                {formData.items.map((item) => (
                  <div key={item.id} className="table-row">
                    <div className="table-cell">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="table-cell">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="table-cell total-cell">
                      ${item.total.toFixed(2)}
                    </div>
                    <div className="table-cell">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItem(item.id)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-link add-more-btn" onClick={addItem}>
                add more...
              </button>
            </div>

            {/* Summary Totals moved under Quote Items */}
            <div className="form-section totals-section">
              <div className="checkbox-group" style={{ marginBottom: '0.5rem' }}>
                <label className="checkbox-label" onClick={() => formData.isTaxEnabled && setIsTaxModalOpen(true)}>
                  <input
                    type="checkbox"
                    checked={formData.isTaxEnabled}
                    onChange={(e) => handleCheckboxChange('isTaxEnabled', e.target.checked)}
                  />
                  Apply Tax ({(formData.taxRate * 100).toFixed(2)}%)
                </label>
              </div>
              <div className="totals-grid">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${formData.subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Tax:</span>
                  <span>${formData.tax.toFixed(2)}</span>
                </div>
                <div className="total-row total-final">
                  <span>Total:</span>
                  <span>${formData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Expires and Payment Terms moved under Totals */}
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="expires">Expires</label>
                <div className="date-input-group">
                  <input
                    type="date"
                    id="expires"
                    value={formData.expires}
                    onChange={(e) => handleInputChange('expires', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="paymentTerms">Payment Terms</label>
                <input
                  type="text"
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  placeholder="Net 30"
                />
              </div>

              {/* Payment Schedule dynamic list */}
              <div className="form-group">
                <label>Payment Schedule</label>
                <div className="items-table schedule-table">
                  <div className="table-header">
                    <div className="header-cell">Percent</div>
                    <div className="header-cell">Description</div>
                    <div className="header-cell" aria-hidden="true"></div>
                  </div>
                  {formData.paymentSchedule.map((t) => (
                    <div key={t.id} className="table-row">
                      <div className="table-cell">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={t.percentage}
                          onChange={(e) => updatePaymentTerm(t.id, 'percentage', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="table-cell">
                        <input
                          type="text"
                          value={t.description}
                          onChange={(e) => updatePaymentTerm(t.id, 'description', e.target.value)}
                          placeholder="e.g., with order"
                        />
                      </div>
                      <div className="table-cell">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removePaymentTerm(t.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="schedule-footer">
                  <button type="button" className="btn btn-link add-more-btn" onClick={addPaymentTerm}>
                    Add Terms
                  </button>
                  <div className={`schedule-total ${paymentScheduleTotal !== 100 ? 'warn' : ''}`}>
                    Total: {paymentScheduleTotal.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="legalese">Legalese</label>
                <textarea
                  id="legalese"
                  value={formData.legalese}
                  onChange={(e) => handleInputChange('legalese', e.target.value)}
                  rows={3}
                  placeholder="Legal terms and conditions..."
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="form-column right-column">
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="quoteHistory">Quote History</label>
                <select
                  id="quoteHistory"
                  value={formData.selectedHistoryVersion}
                  onChange={(e) => handleInputChange('selectedHistoryVersion', e.target.value)}
                  className="history-select"
                >
                  {formData.quoteHistory.map((history) => (
                    <option key={history.id} value={history.id}>
                      {history.version}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="clientComments">Client Comments</label>
                <textarea
                  id="clientComments"
                  value={formData.clientComments}
                  onChange={(e) => handleInputChange('clientComments', e.target.value)}
                  rows={3}
                  placeholder="Client feedback and comments..."
                />
              </div>
            </div>

            <div className="form-section">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => handleCheckboxChange('isRecurring', e.target.checked)}
                  />
                  Recurring Amount
                </label>
              </div>
              <div className="form-group">
                <label htmlFor="billingPeriod">Billing Period</label>
                <input
                  type="text"
                  id="billingPeriod"
                  value={formData.billingPeriod}
                  onChange={(e) => handleInputChange('billingPeriod', e.target.value)}
                  placeholder="e.g., Monthly, Quarterly"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            Save
          </button>
          <button type="button" className="btn btn-primary">
            <Send size={16} />
            Send to Client
          </button>
          <button type="button" className="btn btn-secondary">
            <Archive size={16} />
            Archive
          </button>
        </div>
      </form>

      {isTaxModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit tax rate">
          <div className="modal">
            <h3>Edit Tax Rate</h3>
            <div className="form-group">
              <label htmlFor="taxRateInput">Tax Rate (%)</label>
              <input
                id="taxRateInput"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={Number.isNaN(tempTaxRatePercent) ? '' : tempTaxRatePercent}
                onChange={(e) => setTempTaxRatePercent(parseFloat(e.target.value))}
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setIsTaxModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={applyNewTaxRate}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteForm;

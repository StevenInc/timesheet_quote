import React, { useState } from 'react'
import QuoteFormView from './quote-form/QuoteFormView'
import { useQuoteForm } from './quote-form/useQuoteForm'

const QuoteForm: React.FC = () => {
  const {
    formData,
    setFormData,
    updateItem,
    addItem,
    removeItem,
    handleInputChange,
    handleCheckboxChange,
    updatePaymentTerm,
    addPaymentTerm,
    removePaymentTerm,
    paymentScheduleTotal,
    saveQuote,
    isSaving,
    saveMessage,
    isLoadingHistory,
    loadQuoteHistory,
    // New Quote Modal
    isNewQuoteModalOpen,
    newQuoteNumber,
    openNewQuoteModal,
    closeNewQuoteModal,
    createNewQuote,
    setNewQuoteNumber,
  } = useQuoteForm()

  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false)
  const [tempTaxRatePercent, setTempTaxRatePercent] = useState<number>(0)

  const openTaxModal = () => {
    setTempTaxRatePercent(formData.taxRate * 100)
    setIsTaxModalOpen(true)
  }
  const closeTaxModal = () => setIsTaxModalOpen(false)

  const copyQuoteUrl = () => navigator.clipboard.writeText(formData.quoteUrl)
  const downloadQuote = () => console.log('Downloading quote...')

  const applyNewTaxRate = () => {
    const newRate = Math.max(0, Math.min(100, Number(tempTaxRatePercent))) / 100
    const subtotal = formData.items.reduce((s, i) => s + i.total, 0)
    const tax = formData.isTaxEnabled ? subtotal * newRate : 0
    const total = subtotal + tax
    setFormData({ ...formData, taxRate: newRate, subtotal, tax, total })
    setIsTaxModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const saved = await saveQuote()
      console.log('Saved quote:', saved)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <QuoteFormView
      formData={formData}
      paymentScheduleTotal={paymentScheduleTotal}
      updateItem={updateItem}
      addItem={addItem}
      removeItem={removeItem}
      handleInputChange={handleInputChange}
      handleCheckboxChange={handleCheckboxChange}
      updatePaymentTerm={updatePaymentTerm}
      addPaymentTerm={addPaymentTerm}
      removePaymentTerm={removePaymentTerm}
      isTaxModalOpen={isTaxModalOpen}
      openTaxModal={openTaxModal}
      closeTaxModal={closeTaxModal}
      tempTaxRatePercent={tempTaxRatePercent}
      setTempTaxRatePercent={setTempTaxRatePercent}
      applyNewTaxRate={applyNewTaxRate}
      onSubmit={handleSubmit}
      copyQuoteUrl={copyQuoteUrl}
      downloadQuote={downloadQuote}
      isSaving={isSaving}
      saveMessage={saveMessage}
      isLoadingHistory={isLoadingHistory}
      loadQuoteHistory={loadQuoteHistory}
      // New Quote Modal
      isNewQuoteModalOpen={isNewQuoteModalOpen}
      newQuoteNumber={newQuoteNumber}
      openNewQuoteModal={openNewQuoteModal}
      closeNewQuoteModal={closeNewQuoteModal}
      createNewQuote={createNewQuote}
      setNewQuoteNumber={setNewQuoteNumber}
    />
  )
}

export default QuoteForm

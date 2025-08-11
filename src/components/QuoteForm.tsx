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
    loadQuoteHistory,
    // New Quote Modal
    isNewQuoteModalOpen,
    newQuoteData,
    openNewQuoteModal,
    closeNewQuoteModal,
    createNewQuote,
    updateNewQuoteData,
    clientSuggestions,
    setClientSuggestions,
    isLoadingClients,
    searchClients,
    isCreatingQuote,
    loadClientQuotes,
    clientQuotes,
    isLoadingClientQuotes,
    selectedClientQuote,
    setSelectedClientQuote,
    // Quote Revisions
    quoteRevisions,
    isLoadingQuoteRevisions,
    loadQuoteRevisions,
    loadQuoteRevision,
    archiveQuoteRevision,
    currentLoadedRevisionId,
    currentLoadedQuoteId,
    clearLoadedRevisionState,
    resetForm,
    // View Quote Modal
    isViewQuoteModalOpen,
    openViewQuoteModal,
    closeViewQuoteModal,
    availableClients,
    isLoadingAvailableClients,
    selectedClientId,
    handleClientSelection,
    isTitleModalOpen,
    openTitleModal,
    closeTitleModal,
    submitTitleAndCompleteSave,
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
      loadQuoteHistory={loadQuoteHistory}
      isSaving={isSaving}
      saveMessage={saveMessage}
      isNewQuoteModalOpen={isNewQuoteModalOpen}
      newQuoteData={newQuoteData}
      openNewQuoteModal={openNewQuoteModal}
      closeNewQuoteModal={closeNewQuoteModal}
      createNewQuote={createNewQuote}
      updateNewQuoteData={updateNewQuoteData}
      clientSuggestions={clientSuggestions}
      setClientSuggestions={setClientSuggestions}
      isLoadingClients={isLoadingClients}
      searchClients={searchClients}
      isCreatingQuote={isCreatingQuote}
      loadClientQuotes={loadClientQuotes}
      clientQuotes={clientQuotes}
      isLoadingClientQuotes={isLoadingClientQuotes}
      selectedClientQuote={selectedClientQuote}
      setSelectedClientQuote={setSelectedClientQuote}
      quoteRevisions={quoteRevisions}
      isLoadingQuoteRevisions={isLoadingQuoteRevisions}
      loadQuoteRevisions={loadQuoteRevisions}
      loadQuoteRevision={loadQuoteRevision}
      archiveQuoteRevision={archiveQuoteRevision}
      currentLoadedRevisionId={currentLoadedRevisionId}
      currentLoadedQuoteId={currentLoadedQuoteId}
      clearLoadedRevisionState={clearLoadedRevisionState}
      resetForm={resetForm}
      isViewQuoteModalOpen={isViewQuoteModalOpen}
      openViewQuoteModal={openViewQuoteModal}
      closeViewQuoteModal={closeViewQuoteModal}
      isLoadingAvailableClients={isLoadingAvailableClients}
      availableClients={availableClients}
      selectedClientId={selectedClientId}
      handleClientSelection={handleClientSelection}
      isTitleModalOpen={isTitleModalOpen}
      openTitleModal={openTitleModal}
      closeTitleModal={closeTitleModal}
      submitTitleAndCompleteSave={submitTitleAndCompleteSave}
    />
  )
}

export default QuoteForm

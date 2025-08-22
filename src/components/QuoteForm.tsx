import React from 'react'
import QuoteFormView from './quote-form/QuoteFormView'
import { useQuoteForm } from './quote-form/useQuoteForm'

const QuoteForm: React.FC = () => {
  const {
    formData,
    updateItem,
    addItem,
    removeItem,
    handleInputChange,
    updatePaymentTerm,
    addPaymentTerm,
    removePaymentTerm,
    paymentScheduleTotal,
    saveQuote,
    sendQuoteToClient,
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
    isLoadingClients,
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
    currentLoadedRevisionId,
    currentLoadedQuoteId,
    clearLoadedRevisionState,
    resetForm,
    // View Quote Modal
    isViewQuoteModalOpen,
    openViewQuoteModal,
    closeViewQuoteModal,
    loadAvailableClients,
    handleClientSelection,

    selectedClientId,
    setSelectedClientId,

    handleQuoteSelection,
    // Default Legal Terms Modal
    isDefaultLegalTermsModalOpen,
    openDefaultLegalTermsModal,
    closeDefaultLegalTermsModal,
    saveDefaultLegalTerms,
    defaultLegalTerms,
    // Change tracking
    hasUnsavedChanges,
  } = useQuoteForm()

  const copyQuoteUrl = () => navigator.clipboard.writeText(formData.quoteUrl)
  const downloadQuote = () => console.log('Downloading quote...')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate client email if provided
    if (formData.clientEmail && formData.clientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.clientEmail.trim())) {
        alert('Please enter a valid email address for the client.')
        return
      }
    }

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
      updatePaymentTerm={updatePaymentTerm}
      addPaymentTerm={addPaymentTerm}
      removePaymentTerm={removePaymentTerm}
      onSubmit={handleSubmit}
      copyQuoteUrl={copyQuoteUrl}
      downloadQuote={downloadQuote}
      loadQuoteHistory={loadQuoteHistory}
      isSaving={isSaving}
      saveMessage={saveMessage}
      saveQuote={saveQuote}
      sendQuoteToClient={sendQuoteToClient}
      isNewQuoteModalOpen={isNewQuoteModalOpen}
      newQuoteData={newQuoteData}
      openNewQuoteModal={openNewQuoteModal}
      closeNewQuoteModal={closeNewQuoteModal}
      createNewQuote={createNewQuote}
      updateNewQuoteData={updateNewQuoteData}
      clientSuggestions={clientSuggestions}
      isLoadingClients={isLoadingClients}
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
      currentLoadedRevisionId={currentLoadedRevisionId}
      currentLoadedQuoteId={currentLoadedQuoteId}
      clearLoadedRevisionState={clearLoadedRevisionState}
      resetForm={resetForm}
      isViewQuoteModalOpen={isViewQuoteModalOpen}
      openViewQuoteModal={openViewQuoteModal}
      closeViewQuoteModal={closeViewQuoteModal}
      loadAvailableClients={loadAvailableClients}
      handleClientSelection={handleClientSelection}

      selectedClientId={selectedClientId}
      setSelectedClientId={setSelectedClientId}

      handleQuoteSelection={handleQuoteSelection}
      isDefaultLegalTermsModalOpen={isDefaultLegalTermsModalOpen}
      openDefaultLegalTermsModal={openDefaultLegalTermsModal}
      closeDefaultLegalTermsModal={closeDefaultLegalTermsModal}
      saveDefaultLegalTerms={saveDefaultLegalTerms}
      defaultLegalTerms={defaultLegalTerms}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  )
}

export default QuoteForm

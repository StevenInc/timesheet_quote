import { useState, useEffect } from 'react'
import QuoteForm from './components/QuoteForm'
import { ClientQuoteView } from './components/ClientQuoteView'
import './App.css'

function App() {
  const [isClientView, setIsClientView] = useState(false)
  const [revisionId, setRevisionId] = useState<string | null>(null)

  useEffect(() => {
    // Check if this is a client quote URL
    const urlParams = new URLSearchParams(window.location.search)
    const clientRevisionId = urlParams.get('revision')

    if (clientRevisionId) {
      setIsClientView(true)
      setRevisionId(clientRevisionId)
    }
  }, [])

  if (isClientView && revisionId) {
    return (
      <div className="App">
        <ClientQuoteView revisionId={revisionId} />
      </div>
    )
  }

  return (
    <div className="App">
      <QuoteForm />
    </div>
  )
}

export default App

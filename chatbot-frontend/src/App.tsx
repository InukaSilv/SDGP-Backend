import './index.css'
import './App.css'
import ChatInterface from './components/ChatInterface'

function App() {
  return (
    <div className="container mx-auto max-w-3xl h-screen">
      <h1 className="text-3xl font-bold text-center py-6 text-gray-800">
        Boarding House Finder
      </h1>
      <ChatInterface />
    </div>
  )
}

export default App

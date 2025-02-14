import { useState, useEffect, useRef } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import io from 'socket.io-client'

interface ChatMessage {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socket = io('http://localhost:3000')

  useEffect(() => {
    socket.on('receiveMessage', (data: { sender: string, message: string }) => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.message,
          isBot: data.sender === 'bot',
          timestamp: new Date()
        }
      ])
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        text: inputMessage,
        isBot: false,
        timestamp: new Date()
      }
    ])

    // Send message to backend
    socket.emit('sendMessage', {
      userId: 1, // Replace with actual user ID
      message: inputMessage
    })

    setInputMessage('')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isBot
                  ? 'bg-gray-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              <p className="text-sm">{message.text}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-white">
        <div className="flex space-x-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
          >
            <PaperAirplaneIcon className="w-5 h-5 mr-2" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
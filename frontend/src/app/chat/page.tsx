'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { ProtectedRoute } from '@/components/auth/auth-guard'
import { MainLayout } from '@/components/layout/MainLayout'
import { DocumentsSidebar } from '@/components/sidebar/DocumentsSidebar'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { useDocuments } from '@/hooks/use-documents'
import { Document } from '@/types/document'

export default function ChatPage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
    setMessages([]) // Clear messages when switching documents
  }

  const handleSendMessage = async (messageText: string) => {
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // TODO: Implement actual chat API call
      // For now, simulate a response
      setTimeout(() => {
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you asked: "${messageText}". Based on the document "${selectedDocument?.filename}", I can help you analyze the content. This is a placeholder response until we integrate with the actual chat API.`,
          timestamp: new Date(),
          metadata: {
            sources: selectedDocument ? [{
              filename: selectedDocument.filename,
              relevance_score: 0.85,
            }] : []
          }
        }
        
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }, 1500)
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout 
        showSidebar={true}
        sidebar={
          <DocumentsSidebar 
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentId={selectedDocument?.id.toString()}
          />
        }
      >
        <ChatInterface
          selectedDocument={selectedDocument}
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </MainLayout>
    </ProtectedRoute>
  )
}
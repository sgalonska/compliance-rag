'use client'

import * as React from 'react'
import { Send, Square, Plus, MoreHorizontal, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/spinner'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { 
  useChatSession, 
  useCreateChatSession, 
  useStreamingChat, 
  useUpdateChatSession,
  useExportChat 
} from '@/hooks/use-chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  sessionId?: string
  className?: string
}

export function ChatInterface({ sessionId, className }: ChatInterfaceProps) {
  const [message, setMessage] = React.useState('')
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState('')
  const router = useRouter()

  // Hooks
  const { data: session, isLoading: isSessionLoading } = useChatSession(sessionId || '')
  const createSessionMutation = useCreateChatSession()
  const updateSessionMutation = useUpdateChatSession()
  const exportChatMutation = useExportChat()
  const { 
    sendStreamingMessage, 
    cancelStreaming, 
    isStreaming, 
    streamingMessage, 
    streamingSources 
  } = useStreamingChat(sessionId)

  // Initialize new title when session loads
  React.useEffect(() => {
    if (session) {
      setNewTitle(session.title)
    }
  }, [session])

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return

    let currentSessionId = sessionId

    // Create new session if none exists
    if (!currentSessionId) {
      try {
        const newSession = await createSessionMutation.mutateAsync({
          title: `Chat ${new Date().toLocaleTimeString()}`,
        })
        currentSessionId = newSession.id
        router.push(`/chat/${currentSessionId}`)
      } catch (error) {
        console.error('Failed to create session:', error)
        return
      }
    }

    // Send the message
    await sendStreamingMessage(messageText, {
      sessionId: currentSessionId,
      includeSource: true,
      maxSources: 5,
    })

    setMessage('')
  }

  const handleRenameSession = async () => {
    if (!sessionId || !newTitle.trim()) return

    try {
      await updateSessionMutation.mutateAsync({
        id: sessionId,
        updates: { title: newTitle.trim() },
      })
      setIsRenaming(false)
    } catch (error) {
      console.error('Failed to rename session:', error)
    }
  }

  const handleExportChat = async (format: 'json' | 'markdown' | 'txt') => {
    if (!sessionId) return

    try {
      await exportChatMutation.mutateAsync({ sessionId, format })
    } catch (error) {
      console.error('Failed to export chat:', error)
    }
  }

  const handleNewChat = async () => {
    try {
      const newSession = await createSessionMutation.mutateAsync({
        title: `Chat ${new Date().toLocaleTimeString()}`,
      })
      router.push(`/chat/${newSession.id}`)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  if (isSessionLoading && sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading chat..." />
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            disabled={createSessionMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
          
          {session && (
            <div className="flex items-center space-x-2">
              {isRenaming ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="Enter chat title"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenameSession()
                      } else if (e.key === 'Escape') {
                        setIsRenaming(false)
                        setNewTitle(session.title)
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleRenameSession}
                    disabled={updateSessionMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsRenaming(false)
                      setNewTitle(session.title)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <h1 
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => setIsRenaming(true)}
                    title="Click to rename"
                  >
                    {session.title}
                  </h1>
                  <span className="text-sm text-gray-500">
                    {session.messages.length} messages
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Chat Actions */}
        {session && (
          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Chat</DialogTitle>
                  <DialogDescription>
                    Choose the format to export your chat history.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button
                    onClick={() => handleExportChat('json')}
                    disabled={exportChatMutation.isPending}
                    className="justify-start"
                  >
                    JSON Format
                  </Button>
                  <Button
                    onClick={() => handleExportChat('markdown')}
                    disabled={exportChatMutation.isPending}
                    className="justify-start"
                    variant="outline"
                  >
                    Markdown Format
                  </Button>
                  <Button
                    onClick={() => handleExportChat('txt')}
                    disabled={exportChatMutation.isPending}
                    className="justify-start"
                    variant="outline"
                  >
                    Text Format
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        {session || isStreaming || streamingMessage ? (
          <MessageList
            messages={session?.messages || []}
            isStreaming={isStreaming}
            streamingMessage={streamingMessage}
            streamingSources={streamingSources}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Ask me anything about your documents. I'll help you find the information you need.
                </p>
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>Try asking:</p>
                  <ul className="space-y-1">
                    <li>"What are the key compliance requirements?"</li>
                    <li>"Summarize the main points from the latest policy document"</li>
                    <li>"Find information about data protection requirements"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t bg-white dark:bg-gray-900 p-4">
        <MessageInput
          value={message}
          onChange={setMessage}
          onSend={handleSendMessage}
          onCancel={cancelStreaming}
          isStreaming={isStreaming}
          disabled={createSessionMutation.isPending}
          placeholder={
            session 
              ? "Ask a question about your documents..."
              : "Start a new conversation..."
          }
        />
      </div>
    </div>
  )
}

export default ChatInterface
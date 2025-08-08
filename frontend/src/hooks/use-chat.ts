import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from './use-toast'
import { QueryKeys } from '@/types/api'
import {
  ChatSession,
  ChatRequest,
  ChatResponse,
  ChatSessionCreate,
  ChatSessionUpdate,
  ChatSessionsResponse,
  Message,
  StreamingChatResponse,
} from '@/types/chat'
import { useState, useRef, useCallback } from 'react'

// Fetch chat sessions
export function useChatSessions() {
  return useQuery({
    queryKey: QueryKeys.CHAT_SESSIONS,
    queryFn: async (): Promise<ChatSessionsResponse> => {
      return await api.get('/api/chat/sessions')
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Fetch single chat session
export function useChatSession(id: string) {
  return useQuery({
    queryKey: QueryKeys.CHAT_SESSION(id),
    queryFn: async (): Promise<ChatSession> => {
      return await api.get(`/api/chat/sessions/${id}`)
    },
    enabled: !!id,
    staleTime: 10 * 1000, // 10 seconds
  })
}

// Create chat session
export function useCreateChatSession() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: ChatSessionCreate): Promise<ChatSession> => {
      return await api.post('/api/chat/sessions', data)
    },
    onSuccess: (newSession) => {
      // Add to sessions list
      queryClient.setQueryData(QueryKeys.CHAT_SESSIONS, (old: ChatSessionsResponse | undefined) => {
        if (!old) return { sessions: [newSession], total: 1 }
        return {
          sessions: [newSession, ...old.sessions],
          total: old.total + 1,
        }
      })

      toast({
        title: 'New chat created',
        description: 'Your new chat session is ready.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create chat',
        description: error.detail || 'Could not create new chat session.',
        variant: 'destructive',
      })
    },
  })
}

// Update chat session
export function useUpdateChatSession() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ChatSessionUpdate }): Promise<ChatSession> => {
      return await api.patch(`/api/chat/sessions/${id}`, updates)
    },
    onSuccess: (updatedSession) => {
      // Update session in cache
      queryClient.setQueryData(QueryKeys.CHAT_SESSION(updatedSession.id), updatedSession)
      
      // Update sessions list
      queryClient.setQueryData(QueryKeys.CHAT_SESSIONS, (old: ChatSessionsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          sessions: old.sessions.map(session => 
            session.id === updatedSession.id ? updatedSession : session
          ),
        }
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.detail || 'Failed to update chat session.',
        variant: 'destructive',
      })
    },
  })
}

// Delete chat session
export function useDeleteChatSession() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return await api.delete(`/api/chat/sessions/${id}`)
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QueryKeys.CHAT_SESSION(deletedId) })
      
      // Update sessions list
      queryClient.setQueryData(QueryKeys.CHAT_SESSIONS, (old: ChatSessionsResponse | undefined) => {
        if (!old) return old
        return {
          sessions: old.sessions.filter(session => session.id !== deletedId),
          total: old.total - 1,
        }
      })

      toast({
        title: 'Chat deleted',
        description: 'Chat session has been deleted.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.detail || 'Failed to delete chat session.',
        variant: 'destructive',
      })
    },
  })
}

// Send chat message (non-streaming)
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (request: ChatRequest): Promise<ChatResponse> => {
      return await api.post('/api/chat/message', request)
    },
    onSuccess: (response, request) => {
      // Update chat session in cache with new messages
      const sessionId = response.session_id
      
      queryClient.setQueryData(QueryKeys.CHAT_SESSION(sessionId), (old: ChatSession | undefined) => {
        if (!old) return old
        
        // Add both user message and assistant response
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          content: request.message,
          role: 'user',
          timestamp: new Date().toISOString(),
        }
        
        return {
          ...old,
          messages: [...old.messages, userMessage, response.message],
          updated_at: new Date().toISOString(),
        }
      })

      // Update sessions list with new updated_at time
      queryClient.setQueryData(QueryKeys.CHAT_SESSIONS, (old: ChatSessionsResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          sessions: old.sessions.map(session =>
            session.id === sessionId
              ? { ...session, updated_at: new Date().toISOString() }
              : session
          ),
        }
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Message failed',
        description: error.detail || 'Failed to send message.',
        variant: 'destructive',
      })
    },
  })
}

// Hook for streaming chat
export function useStreamingChat(sessionId?: string) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [streamingSources, setStreamingSources] = useState<any[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const sendStreamingMessage = useCallback(async (
    message: string,
    options: {
      sessionId?: string
      includeSource?: boolean
      maxSources?: number
    } = {}
  ) => {
    if (isStreaming) return

    setIsStreaming(true)
    setStreamingMessage('')
    setStreamingSources([])
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          message,
          session_id: options.sessionId || sessionId,
          include_sources: options.includeSource ?? true,
          max_sources: options.maxSources ?? 5,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentMessageId = ''
      let finalSessionId = options.sessionId || sessionId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamingChatResponse = JSON.parse(line.slice(6))
              
              switch (data.type) {
                case 'token':
                  setStreamingMessage(prev => prev + (data.content || ''))
                  break
                  
                case 'sources':
                  if (data.sources) {
                    setStreamingSources(data.sources)
                  }
                  break
                  
                case 'done':
                  if (data.message_id) {
                    currentMessageId = data.message_id
                  }
                  break
                  
                case 'error':
                  throw new Error(data.error || 'Streaming error')
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', line)
            }
          }
        }
      }

      // Update chat session with final message
      if (finalSessionId && currentMessageId && streamingMessage) {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          content: message,
          role: 'user',
          timestamp: new Date().toISOString(),
        }

        const assistantMessage: Message = {
          id: currentMessageId,
          content: streamingMessage,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          metadata: {
            sources: streamingSources,
          },
        }

        queryClient.setQueryData(QueryKeys.CHAT_SESSION(finalSessionId), (old: ChatSession | undefined) => {
          if (!old) return old
          return {
            ...old,
            messages: [...old.messages, userMessage, assistantMessage],
            updated_at: new Date().toISOString(),
          }
        })

        // Update sessions list
        queryClient.setQueryData(QueryKeys.CHAT_SESSIONS, (old: ChatSessionsResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            sessions: old.sessions.map(session =>
              session.id === finalSessionId
                ? { ...session, updated_at: new Date().toISOString() }
                : session
            ),
          }
        })
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: 'Streaming failed',
          description: error.message || 'Failed to stream message.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsStreaming(false)
      setStreamingMessage('')
      setStreamingSources([])
      abortControllerRef.current = null
    }
  }, [isStreaming, sessionId, queryClient, toast, streamingMessage, streamingSources])

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    sendStreamingMessage,
    cancelStreaming,
    isStreaming,
    streamingMessage,
    streamingSources,
  }
}

// Export message from chat
export function useExportChat() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ sessionId, format }: { sessionId: string; format: 'json' | 'markdown' | 'txt' }) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/sessions/${sessionId}/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      return response.blob()
    },
    onSuccess: (blob, { sessionId, format }) => {
      // Download the file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-${sessionId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Chat exported',
        description: 'Chat has been exported successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export chat.',
        variant: 'destructive',
      })
    },
  })
}
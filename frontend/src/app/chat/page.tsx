'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react'

import { ProtectedRoute } from '@/components/auth/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/spinner'
import { ChatInterface } from '@/components/chat/chat-interface'
import { 
  useChatSessions, 
  useCreateChatSession, 
  useDeleteChatSession 
} from '@/hooks/use-chat'
import { formatTimeAgo, cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function ChatSidebar() {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [sessionToDelete, setSessionToDelete] = React.useState<string | null>(null)
  
  const router = useRouter()
  const { data: sessionsData, isLoading } = useChatSessions()
  const createSessionMutation = useCreateChatSession()
  const deleteSessionMutation = useDeleteChatSession()

  const handleCreateNewChat = async () => {
    try {
      const newSession = await createSessionMutation.mutateAsync({
        title: `Chat ${new Date().toLocaleTimeString()}`,
      })
      router.push(`/chat/${newSession.id}`)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return
    
    try {
      await deleteSessionMutation.mutateAsync(sessionToDelete)
      setDeleteDialogOpen(false)
      setSessionToDelete(null)
      
      // Redirect to main chat page if deleting current session
      if (window.location.pathname.includes(sessionToDelete)) {
        router.push('/chat')
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const openDeleteDialog = (sessionId: string) => {
    setSessionToDelete(sessionId)
    setDeleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSpinner text="Loading conversations..." />
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <Button
          onClick={handleCreateNewChat}
          disabled={createSessionMutation.isPending}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {!sessionsData?.sessions || sessionsData.sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start your first conversation!</p>
          </div>
        ) : (
          <div className="p-2">
            {sessionsData.sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center justify-between p-3 rounded-lg mb-2 cursor-pointer transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  window.location.pathname.includes(session.id) 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : ''
                )}
                onClick={() => router.push(`/chat/${session.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {session.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{session.messages.length} messages</span>
                    <span>•</span>
                    <span>{formatTimeAgo(session.updated_at)}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/chat/${session.id}`)
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog(session.id)
                        }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSession}
              disabled={deleteSessionMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChatContent() {
  return (
    <div className="flex-1 flex flex-col">
      <ChatInterface className="h-full" />
    </div>
  )
}

function EmptyState() {
  const router = useRouter()
  const createSessionMutation = useCreateChatSession()

  const handleCreateNewChat = async () => {
    try {
      const newSession = await createSessionMutation.mutateAsync({
        title: `Chat ${new Date().toLocaleTimeString()}`,
      })
      router.push(`/chat/${newSession.id}`)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold mb-2">AI Assistant Ready</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start a conversation to get insights from your documents. 
            I can help you understand compliance requirements, analyze policies, and answer questions.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleCreateNewChat}
              disabled={createSessionMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start New Conversation
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/documents">
                📄 Upload Documents First
              </Link>
            </Button>
          </div>

          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p className="font-medium mb-2">Try asking:</p>
            <ul className="space-y-1 text-left">
              <li>• "What are the key compliance requirements?"</li>
              <li>• "Summarize the latest policy changes"</li>
              <li>• "Find information about data protection"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
        <ChatSidebar />
        <EmptyState />
      </div>
    </ProtectedRoute>
  )
}
'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react'

import { ProtectedRoute } from '@/components/auth/auth-guard'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/spinner'
import { ChatInterface } from '@/components/chat/chat-interface'
import { useChatSession, useDeleteChatSession } from '@/hooks/use-chat'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatPageProps {
  params: {
    id: string
  }
}

function ChatHeader({ sessionId }: { sessionId: string }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const router = useRouter()
  const { data: session } = useChatSession(sessionId)
  const deleteSessionMutation = useDeleteChatSession()

  const handleBack = () => {
    router.push('/chat')
  }

  const handleDelete = async () => {
    try {
      await deleteSessionMutation.mutateAsync(sessionId)
      router.push('/chat')
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chats
        </Button>
        
        {session && (
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {session.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {session.messages.length} messages
            </p>
          </div>
        )}
      </div>

      {session && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chats
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{session?.title}"? This action cannot be undone.
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
              onClick={handleDelete}
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

function ChatContent({ sessionId }: { sessionId: string }) {
  const { data: session, isLoading, error } = useChatSession(sessionId)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner text="Loading conversation..." />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😕</div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Conversation Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              This conversation may have been deleted or you don't have access to it.
            </p>
          </div>
          <Button onClick={() => router.push('/chat')}>
            Back to Chats
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <ChatInterface sessionId={sessionId} className="h-full" />
    </div>
  )
}

export default function ChatSessionPage({ params }: ChatPageProps) {
  const { id } = params

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <ChatHeader sessionId={id} />
        <React.Suspense fallback={<LoadingSpinner text="Loading chat..." />}>
          <ChatContent sessionId={id} />
        </React.Suspense>
      </div>
    </ProtectedRoute>
  )
}
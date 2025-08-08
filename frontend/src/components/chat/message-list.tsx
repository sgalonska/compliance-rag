'use client'

import * as React from 'react'
import { User, Bot, FileText, ExternalLink, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { formatTimeAgo, cn } from '@/lib/utils'
import { Message, DocumentReference } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  streamingMessage?: string
  streamingSources?: DocumentReference[]
  className?: string
}

export function MessageList({ 
  messages, 
  isStreaming = false, 
  streamingMessage = '', 
  streamingSources = [],
  className 
}: MessageListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingMessage])

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy message',
        variant: 'destructive',
      })
    }
  }

  const MessageContent = React.memo(({ content }: { content: string }) => (
    <ReactMarkdown
      className="prose prose-sm dark:prose-invert max-w-none"
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ inline, children }) =>
          inline ? (
            <code className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">
              {children}
            </code>
          ) : (
            <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-x-auto">
              <code>{children}</code>
            </pre>
          ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  ))

  const SourceCard = React.memo(({ source }: { source: DocumentReference }) => (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-3">
        <div className="flex items-start space-x-2">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                {source.filename}
              </h4>
              <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2">
                {Math.round(source.relevance_score * 100)}% match
              </span>
            </div>
            {source.page_number && (
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Page {source.page_number}
              </p>
            )}
            {source.snippet && (
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1 line-clamp-2">
                "{source.snippet}"
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400"
            onClick={() => {
              // TODO: Implement document viewing/download
              toast({
                title: 'Feature coming soon',
                description: 'Document viewing will be available soon.',
              })
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  ))

  const MessageBubble = React.memo(({ 
    message, 
    isLast = false 
  }: { 
    message: Message
    isLast?: boolean 
  }) => {
    const [copied, setCopied] = React.useState(false)
    const isUser = message.role === 'user'

    const handleCopy = async () => {
      await copyToClipboard(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <div className={cn(
        'flex gap-3 p-4',
        isUser ? 'justify-end' : 'justify-start'
      )}>
        {!isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          'max-w-[70%] space-y-2',
          isUser && 'items-end'
        )}>
          <div className={cn(
            'relative group rounded-lg p-3 shadow-sm',
            isUser
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          )}>
            <MessageContent content={message.content} />
            
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0',
                isUser 
                  ? 'bg-white text-gray-600 hover:bg-gray-100' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>

          {/* Sources for assistant messages */}
          {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Sources ({message.metadata.sources.length}):
              </h4>
              <div className="space-y-2">
                {message.metadata.sources.map((source, index) => (
                  <SourceCard key={index} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
            <span>{formatTimeAgo(message.timestamp)}</span>
            {!isUser && message.metadata?.processing_time && (
              <>
                <span>•</span>
                <span>{message.metadata.processing_time}ms</span>
              </>
            )}
            {!isUser && message.metadata?.tokens_used && (
              <>
                <span>•</span>
                <span>{message.metadata.tokens_used} tokens</span>
              </>
            )}
          </div>
        </div>

        {isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    )
  })

  return (
    <div 
      ref={scrollRef}
      className={cn(
        'flex-1 overflow-y-auto space-y-0 bg-gray-50 dark:bg-gray-900/50',
        className
      )}
    >
      {messages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full text-center">
          <div className="space-y-4 max-w-md">
            <div className="text-4xl">🤖</div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Ready to Help
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                I'm here to help you explore and understand your documents. Ask me anything!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Render existing messages */}
      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}

      {/* Render streaming message */}
      {(isStreaming || streamingMessage) && (
        <div className="flex gap-3 p-4">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          
          <div className="max-w-[70%] space-y-2">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
              {streamingMessage ? (
                <MessageContent content={streamingMessage} />
              ) : (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Thinking...
                  </span>
                </div>
              )}
            </div>

            {/* Streaming sources */}
            {streamingSources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sources ({streamingSources.length}):
                </h4>
                <div className="space-y-2">
                  {streamingSources.map((source, index) => (
                    <SourceCard key={index} source={source} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageList
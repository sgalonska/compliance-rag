'use client'

import * as React from 'react'
import { Send, Square, Paperclip, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string) => void
  onCancel?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  maxLength?: number
  showAttachment?: boolean
  showVoiceInput?: boolean
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onCancel,
  isStreaming = false,
  disabled = false,
  placeholder = 'Type your message...',
  className,
  maxLength = 4000,
  showAttachment = false,
  showVoiceInput = false,
}: MessageInputProps) {
  const [isRecording, setIsRecording] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [value])

  // Focus on mount
  React.useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || isStreaming || disabled) return
    
    onSend(value.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!value.trim() || isStreaming || disabled) return
      onSend(value.trim())
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  const handleAttachment = () => {
    // TODO: Implement file attachment
    toast({
      title: 'Feature coming soon',
      description: 'File attachment will be available soon.',
    })
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      toast({
        title: 'Recording stopped',
        description: 'Voice input feature coming soon.',
      })
    } else {
      // Start recording
      setIsRecording(true)
      toast({
        title: 'Recording started',
        description: 'Voice input feature coming soon.',
      })
      
      // Auto-stop after 10 seconds (demo)
      setTimeout(() => {
        setIsRecording(false)
      }, 10000)
    }
  }

  const remainingChars = maxLength - value.length
  const isOverLimit = remainingChars < 0

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-2', className)}>
      <div className="flex items-end space-x-2">
        {/* Attachment button */}
        {showAttachment && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAttachment}
            disabled={disabled || isStreaming}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        )}

        {/* Message input container */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 pr-12 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              isOverLimit && 'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />

          {/* Character count */}
          {maxLength && (
            <div className={cn(
              'absolute bottom-1 right-12 text-xs',
              isOverLimit 
                ? 'text-red-500' 
                : remainingChars < 100 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-gray-400'
            )}>
              {remainingChars}
            </div>
          )}
        </div>

        {/* Voice input button */}
        {showVoiceInput && (
          <Button
            type="button"
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            onClick={handleVoiceInput}
            disabled={disabled || isStreaming}
            className="flex-shrink-0"
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Send/Cancel button */}
        <Button
          type={isStreaming ? 'button' : 'submit'}
          onClick={isStreaming ? handleCancel : undefined}
          disabled={disabled || (!isStreaming && (!value.trim() || isOverLimit))}
          variant={isStreaming ? 'destructive' : 'default'}
          size="icon"
          className="flex-shrink-0"
        >
          {isStreaming ? (
            <Square className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Helper text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
        {isStreaming ? (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse delay-75"></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse delay-150"></div>
            </div>
            <span>AI is responding... Click stop to cancel</span>
          </div>
        ) : (
          <span>Press Enter to send, Shift+Enter for new line</span>
        )}
      </div>
    </form>
  )
}

export default MessageInput
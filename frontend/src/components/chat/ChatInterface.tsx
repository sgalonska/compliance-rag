'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  Chip,
  Card,
  CardContent,
  Fade,
  Skeleton,
  Tooltip,
  useTheme,
} from '@mui/material'
import {
  Send,
  AttachFile,
  SmartToy,
  Person,
  ContentCopy,
  ThumbUp,
  ThumbDown,
  Share,
  Refresh,
  Source,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Message, DocumentReference } from '@/types/chat'
import { Document } from '@/types/document'
import { formatTimeAgo } from '@/lib/utils'

interface ChatInterfaceProps {
  selectedDocument?: Document | null
  messages?: Message[]
  onSendMessage?: (message: string) => void
  isLoading?: boolean
  streamingMessage?: string
  streamingSources?: DocumentReference[]
}

export function ChatInterface({ 
  selectedDocument, 
  messages = [], 
  onSendMessage,
  isLoading = false,
  streamingMessage = '',
  streamingSources = []
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const MessageBubble = ({ msg, index }: { msg: Message; index: number }) => {
    const isUser = msg.role === 'user'
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
      await navigator.clipboard.writeText(msg.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        style={{ marginBottom: 24 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: isUser ? 'primary.main' : 'grey.100',
              color: isUser ? 'primary.contrastText' : 'primary.main',
              width: 40,
              height: 40,
            }}
          >
            {isUser ? <Person /> : <SmartToy />}
          </Avatar>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isUser ? 'You' : 'Assistant'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimeAgo(msg.timestamp)}
              </Typography>
            </Box>

            <Card
              elevation={0}
              sx={{
                bgcolor: isUser ? 'primary.50' : 'grey.50',
                border: '1px solid',
                borderColor: isUser ? 'primary.100' : 'grey.200',
                position: 'relative',
                '&:hover .message-actions': {
                  opacity: 1,
                },
              }}
            >
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box
                  className="message-actions"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    gap: 0.5,
                  }}
                >
                  <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton size="small" onClick={handleCopy}>
                      <ContentCopy sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  {!isUser && (
                    <>
                      <Tooltip title="Good response">
                        <IconButton size="small">
                          <ThumbUp sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Poor response">
                        <IconButton size="small">
                          <ThumbDown sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>

                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <Typography variant="body1" paragraph sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                        {children}
                      </Typography>
                    ),
                    code: ({ children, ...props }) => {
                      const inline = !props.className?.includes('language-')
                      return (
                        <Box
                          component={inline ? 'code' : 'pre'}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: inline ? '0.875em' : '0.875rem',
                            bgcolor: 'grey.100',
                            px: inline ? 0.5 : 2,
                            py: inline ? 0.25 : 1,
                            borderRadius: 1,
                            display: inline ? 'inline' : 'block',
                            overflow: 'auto',
                          }}
                        >
                          {children}
                        </Box>
                      )
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>

                {/* Sources */}
                {!isUser && msg.metadata?.sources && msg.metadata.sources.length > 0 && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Source sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        SOURCES ({msg.metadata.sources.length})
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {msg.metadata.sources.map((source, idx) => (
                        <Chip
                          key={idx}
                          label={`${source.filename} (${Math.round(source.relevance_score * 100)}%)`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 11 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </motion.div>
    )
  }

  const StreamingMessage = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 24 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: 'grey.100',
            color: 'primary.main',
            width: 40,
            height: 40,
          }}
        >
          <SmartToy />
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Assistant
            </Typography>
            <Chip label="Thinking..." size="small" sx={{ height: 20 }} />
          </Box>

          <Card
            elevation={0}
            sx={{
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              {streamingMessage ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <Typography variant="body1" paragraph sx={{ mb: 1, '&:last-child': { mb: 0 } }}>
                        {children}
                      </Typography>
                    ),
                    code: ({ children, ...props }) => {
                      const inline = !props.className?.includes('language-')
                      return (
                        <Box
                          component={inline ? 'code' : 'pre'}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: inline ? '0.875em' : '0.875rem',
                            bgcolor: 'grey.100',
                            px: inline ? 0.5 : 2,
                            py: inline ? 0.25 : 1,
                            borderRadius: 1,
                            display: inline ? 'inline' : 'block',
                            overflow: 'auto',
                          }}
                        >
                          {children}
                        </Box>
                      )
                    },
                  }}
                >
                  {streamingMessage}
                </ReactMarkdown>
              ) : (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Skeleton variant="text" width="100%" height={24} />
                </Box>
              )}

              {/* Streaming Sources */}
              {streamingSources.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Source sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      SOURCES ({streamingSources.length})
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {streamingSources.map((source, idx) => (
                      <Chip
                        key={idx}
                        label={`${source.filename} (${Math.round(source.relevance_score * 100)}%)`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </motion.div>
  )

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      {selectedDocument && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'primary.50',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Chatting about: {selectedDocument.filename}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ask questions about this document's content
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Messages Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        {messages.length === 0 && !isLoading && !streamingMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 80,
                height: 80,
                mb: 3,
              }}
            >
              <SmartToy sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              Welcome to Compliance RAG
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
              {selectedDocument
                ? `Ask me anything about "${selectedDocument.filename}". I'll help you understand and analyze the document content.`
                : 'Select a document from the sidebar to start asking questions about its content.'}
            </Typography>
            
            {selectedDocument && (
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                <Chip label="What is this document about?" variant="outlined" />
                <Chip label="Summarize the key points" variant="outlined" />
                <Chip label="Find compliance requirements" variant="outlined" />
              </Box>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, index) => (
            <MessageBubble key={msg.id} msg={msg} index={index} />
          ))}
        </AnimatePresence>

        {(isLoading || streamingMessage) && <StreamingMessage />}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={selectedDocument ? "Ask about this document..." : "Select a document to start chatting..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!selectedDocument || isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '24px',
                backgroundColor: 'grey.50',
              },
            }}
            InputProps={{
              endAdornment: (
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <Tooltip title="Attach file">
                    <IconButton size="small" disabled>
                      <AttachFile />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Send message">
                    <IconButton
                      size="small"
                      onClick={handleSend}
                      disabled={!message.trim() || !selectedDocument || isLoading}
                      sx={{
                        bgcolor: message.trim() && selectedDocument && !isLoading ? 'primary.main' : 'grey.200',
                        color: message.trim() && selectedDocument && !isLoading ? 'primary.contrastText' : 'grey.500',
                        '&:hover': {
                          bgcolor: message.trim() && selectedDocument && !isLoading ? 'primary.dark' : 'grey.300',
                        },
                      }}
                    >
                      <Send />
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            }}
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Press Enter to send, Shift+Enter for new line
        </Typography>
      </Paper>
    </Box>
  )
}

export default ChatInterface
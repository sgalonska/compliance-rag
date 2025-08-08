export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  sources?: DocumentReference[]
  confidence?: number
  processing_time?: number
  model_used?: string
  tokens_used?: number
}

export interface DocumentReference {
  document_id: string
  filename: string
  page_number?: number
  chunk_id?: string
  relevance_score: number
  snippet?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
  user_id: string
}

export interface ChatRequest {
  message: string
  session_id?: string
  include_sources?: boolean
  max_sources?: number
}

export interface ChatResponse {
  message: Message
  session_id: string
  sources?: DocumentReference[]
}

export interface ChatSessionCreate {
  title?: string
}

export interface ChatSessionUpdate {
  title: string
}

export interface ChatSessionsResponse {
  sessions: ChatSession[]
  total: number
}

export interface StreamingChatResponse {
  type: 'token' | 'sources' | 'done' | 'error'
  content?: string
  sources?: DocumentReference[]
  error?: string
  message_id?: string
}
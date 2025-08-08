export interface Document {
  id: string
  filename: string
  content_type: string
  file_size: number
  upload_date: string
  processed: boolean
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  metadata: DocumentMetadata
  tags: string[]
  owner_id: string
  created_at: string
  updated_at: string
}

export interface DocumentMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creation_date?: string
  modification_date?: string
  pages?: number
  word_count?: number
  char_count?: number
  language?: string
  document_type?: string
}

export interface DocumentUploadRequest {
  file: File
  tags?: string[]
  metadata?: Partial<DocumentMetadata>
}

export interface DocumentUploadResponse {
  document: Document
  message: string
}

export interface DocumentSearchRequest {
  query?: string
  tags?: string[]
  document_type?: string
  date_from?: string
  date_to?: string
  processed?: boolean
  limit?: number
  offset?: number
}

export interface DocumentSearchResponse {
  documents: Document[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DocumentDeleteResponse {
  message: string
}

export interface DocumentProcessingStatus {
  document_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error_message?: string
  updated_at: string
}
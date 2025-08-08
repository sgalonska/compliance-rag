export interface ApiError {
  detail: string
  error_code?: string
  field_errors?: Record<string, string[]>
}

export interface ApiResponse<T = any> {
  data?: T
  message?: string
  success: boolean
  error?: ApiError
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiRequestConfig {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: 'healthy' | 'unhealthy'
    qdrant: 'healthy' | 'unhealthy'
    embedding_service: 'healthy' | 'unhealthy'
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestInterceptor {
  onRequest?: (config: any) => any
  onError?: (error: any) => any
}

export interface ResponseInterceptor {
  onResponse?: (response: any) => any
  onError?: (error: any) => any
}

// Query keys for React Query
export const QueryKeys = {
  AUTH: ['auth'],
  USER: ['user'],
  DOCUMENTS: ['documents'],
  DOCUMENT: (id: string) => ['document', id],
  CHAT_SESSIONS: ['chatSessions'],
  CHAT_SESSION: (id: string) => ['chatSession', id],
  HEALTH: ['health'],
} as const
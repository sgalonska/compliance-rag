import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from './use-toast'
import { QueryKeys } from '@/types/api'
import {
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
  DocumentSearchRequest,
  DocumentSearchResponse,
  DocumentDeleteResponse,
  DocumentProcessingStatus,
} from '@/types/document'

// Fetch documents with search and pagination
export function useDocuments(searchParams: DocumentSearchRequest = {}) {
  return useQuery({
    queryKey: [...QueryKeys.DOCUMENTS, searchParams],
    queryFn: async (): Promise<DocumentSearchResponse> => {
      const params = new URLSearchParams()
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      return await api.get(`/api/documents?${params.toString()}`)
    },
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true,
  })
}

// Infinite scroll for documents
export function useInfiniteDocuments(searchParams: Omit<DocumentSearchRequest, 'offset' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: [...QueryKeys.DOCUMENTS, 'infinite', searchParams],
    queryFn: async ({ pageParam = 0 }): Promise<DocumentSearchResponse> => {
      const params = new URLSearchParams()
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })

      params.append('offset', pageParam.toString())
      params.append('limit', '20')

      return await api.get(`/api/documents?${params.toString()}`)
    },
    getNextPageParam: (lastPage) => {
      const { page, total_pages } = lastPage
      return page < total_pages ? page * 20 : undefined
    },
    staleTime: 30 * 1000,
  })
}

// Fetch single document
export function useDocument(id: string) {
  return useQuery({
    queryKey: QueryKeys.DOCUMENT(id),
    queryFn: async (): Promise<Document> => {
      return await api.get(`/api/documents/${id}`)
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Upload document(s)
export function useUploadDocuments() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (uploadRequest: DocumentUploadRequest): Promise<DocumentUploadResponse> => {
      const { file, tags, metadata } = uploadRequest
      
      return await api.upload('/api/documents/upload', file, {
        additionalData: {
          ...(tags && { tags: JSON.stringify(tags) }),
          ...(metadata && { metadata: JSON.stringify(metadata) }),
        },
      })
    },
    onSuccess: (response) => {
      // Invalidate documents queries to refetch
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOCUMENTS })
      
      toast({
        title: 'Document uploaded',
        description: `${response.document.filename} uploaded successfully and is being processed.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.detail || 'Failed to upload document.',
        variant: 'destructive',
      })
    },
  })
}

// Upload multiple documents
export function useUploadMultipleDocuments() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (uploads: DocumentUploadRequest[]): Promise<DocumentUploadResponse[]> => {
      const results = []
      
      for (const uploadRequest of uploads) {
        try {
          const { file, tags, metadata } = uploadRequest
          const result = await api.upload('/api/documents/upload', file, {
            additionalData: {
              ...(tags && { tags: JSON.stringify(tags) }),
              ...(metadata && { metadata: JSON.stringify(metadata) }),
            },
          })
          results.push(result)
        } catch (error) {
          console.error(`Failed to upload ${uploadRequest.file.name}:`, error)
          throw error
        }
      }
      
      return results
    },
    onSuccess: (responses) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOCUMENTS })
      
      toast({
        title: 'Documents uploaded',
        description: `${responses.length} document(s) uploaded successfully and are being processed.`,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.detail || 'Failed to upload one or more documents.',
        variant: 'destructive',
      })
    },
  })
}

// Delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string): Promise<DocumentDeleteResponse> => {
      return await api.delete(`/api/documents/${id}`)
    },
    onSuccess: (_, documentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: QueryKeys.DOCUMENT(documentId) })
      
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOCUMENTS })
      
      toast({
        title: 'Document deleted',
        description: 'Document has been deleted successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.detail || 'Failed to delete document.',
        variant: 'destructive',
      })
    },
  })
}

// Get document processing status
export function useDocumentProcessingStatus(documentId: string) {
  return useQuery({
    queryKey: [...QueryKeys.DOCUMENT(documentId), 'status'],
    queryFn: async (): Promise<DocumentProcessingStatus> => {
      return await api.get(`/api/documents/${documentId}/status`)
    },
    enabled: !!documentId,
    refetchInterval: (data) => {
      // Stop polling if processing is complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false
      }
      return 2000 // Poll every 2 seconds while processing
    },
    staleTime: 0, // Always refetch
  })
}

// Reprocess document
export function useReprocessDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return await api.post(`/api/documents/${id}/reprocess`)
    },
    onSuccess: (_, documentId) => {
      // Invalidate document and status queries
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOCUMENT(documentId) })
      queryClient.invalidateQueries({ queryKey: [...QueryKeys.DOCUMENT(documentId), 'status'] })
      
      toast({
        title: 'Reprocessing started',
        description: 'Document is being reprocessed.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Reprocess failed',
        description: error.detail || 'Failed to start reprocessing.',
        variant: 'destructive',
      })
    },
  })
}

// Update document metadata
export function useUpdateDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<Document, 'tags' | 'metadata'>> }): Promise<Document> => {
      return await api.patch(`/api/documents/${id}`, updates)
    },
    onSuccess: (updatedDocument) => {
      // Update cache
      queryClient.setQueryData(QueryKeys.DOCUMENT(updatedDocument.id), updatedDocument)
      
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: QueryKeys.DOCUMENTS })
      
      toast({
        title: 'Document updated',
        description: 'Document has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.detail || 'Failed to update document.',
        variant: 'destructive',
      })
    },
  })
}

// Download document
export function useDownloadDocument() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string): Promise<Blob> => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${id}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      return response.blob()
    },
    onError: (error: any) => {
      toast({
        title: 'Download failed',
        description: error.message || 'Failed to download document.',
        variant: 'destructive',
      })
    },
  })
}
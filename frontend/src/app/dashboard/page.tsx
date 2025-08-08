'use client'

import * as React from 'react'
import Link from 'next/link'
import { 
  FileText, 
  MessageCircle, 
  Upload, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Database
} from 'lucide-react'

import { ProtectedRoute } from '@/components/auth/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/use-auth'
import { useDocuments } from '@/hooks/use-documents'
import { useChatSessions } from '@/hooks/use-chat'
import { formatBytes, formatTimeAgo } from '@/lib/utils'

function DashboardStats() {
  const { data: documentsData, isLoading: documentsLoading } = useDocuments({ limit: 100 })
  const { data: chatSessionsData, isLoading: sessionsLoading } = useChatSessions()

  const stats = React.useMemo(() => {
    if (!documentsData?.documents) {
      return {
        totalDocuments: 0,
        processedDocuments: 0,
        processingDocuments: 0,
        failedDocuments: 0,
        totalSize: 0,
      }
    }

    return documentsData.documents.reduce(
      (acc, doc) => {
        acc.totalDocuments += 1
        acc.totalSize += doc.file_size
        
        switch (doc.processing_status) {
          case 'completed':
            acc.processedDocuments += 1
            break
          case 'processing':
          case 'pending':
            acc.processingDocuments += 1
            break
          case 'failed':
            acc.failedDocuments += 1
            break
        }
        
        return acc
      },
      {
        totalDocuments: 0,
        processedDocuments: 0,
        processingDocuments: 0,
        failedDocuments: 0,
        totalSize: 0,
      }
    )
  }, [documentsData])

  const isLoading = documentsLoading || sessionsLoading

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard stats..." />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          <p className="text-xs text-muted-foreground">
            {formatBytes(stats.totalSize)} total size
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.processedDocuments}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalDocuments > 0 
              ? Math.round((stats.processedDocuments / stats.totalDocuments) * 100)
              : 0
            }% completion rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.processingDocuments}</div>
          <p className="text-xs text-muted-foreground">
            Currently being processed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{chatSessionsData?.total || 0}</div>
          <p className="text-xs text-muted-foreground">
            Total conversations
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RecentActivity() {
  const { data: documentsData } = useDocuments({ limit: 5 })
  const { data: chatSessionsData } = useChatSessions()

  const recentDocuments = documentsData?.documents?.slice(0, 5) || []
  const recentChats = chatSessionsData?.sessions?.slice(0, 3) || []

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Recent Documents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentDocuments.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/documents">Upload Documents</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.filename}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatBytes(doc.file_size)}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(doc.upload_date)}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {doc.processing_status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {(doc.processing_status === 'processing' || doc.processing_status === 'pending') && (
                      <Clock className="h-4 w-4 text-blue-600" />
                    )}
                    {doc.processing_status === 'failed' && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/documents">View All Documents</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Recent Conversations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentChats.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/chat">Start Chatting</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentChats.map((session) => (
                <Link
                  key={session.id}
                  href={`/chat/${session.id}`}
                  className="block p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{session.messages.length} messages</span>
                        <span>•</span>
                        <span>{formatTimeAgo(session.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/chat">View All Conversations</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <Button asChild className="h-24 flex-col space-y-2">
            <Link href="/documents">
              <Upload className="h-8 w-8" />
              <span>Upload Documents</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-24 flex-col space-y-2">
            <Link href="/chat">
              <MessageCircle className="h-8 w-8" />
              <span>Start Chat</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-24 flex-col space-y-2">
            <Link href="/documents">
              <BarChart3 className="h-8 w-8" />
              <span>View Analytics</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardContent() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here's an overview of your compliance document analysis system
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <React.Suspense fallback={<LoadingSpinner text="Loading dashboard..." />}>
          <DashboardContent />
        </React.Suspense>
      </div>
    </ProtectedRoute>
  )
}
'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageSquare, FileText, Shield, Zap } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { user } = useAuth()

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome back, {user.username || user.email}
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your AI-powered compliance assistant is ready
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/chat">
                <Button size="lg" className="text-lg">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Start Chatting
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="outline" size="lg" className="text-lg">
                  <FileText className="mr-2 h-5 w-5" />
                  Manage Documents
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Compliance RAG
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered compliance assistant that understands your documents
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="text-lg">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" size="lg" className="text-lg">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 text-center">
            <Shield className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure & Compliant</h3>
            <p className="text-gray-600">
              Enterprise-grade security for your sensitive compliance documents
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Chat</h3>
            <p className="text-gray-600">
              Ask questions about your compliance requirements in natural language
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <Zap className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Instant Answers</h3>
            <p className="text-gray-600">
              Get accurate answers with source citations in seconds
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
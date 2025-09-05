// import { useState } from "react";
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';

// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function App() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to LLM Frontend
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered conversation platform
          </p>

          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Welcome back, {user?.email || 'User'}!
              </p>
              <div className="flex justify-center space-x-4">
                <Link to="/chat">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Start Chatting
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Get started with your AI conversations
              </p>
              <div className="flex justify-center space-x-4">
                <Link to="/login">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="outline">
                    Register
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-600">💬</span>
                Chat Interface
              </CardTitle>
              <CardDescription>
                Start conversations with AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Interact with AI agents through a natural chat interface
              </p>
              <Link to="/chat">
                <Button className="w-full">Open Chat</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-600">🤖</span>
                Agent Management
              </CardTitle>
              <CardDescription>Create and manage AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Create, configure, and monitor your AI agents
              </p>
              <Link to="/agents">
                <Button className="w-full">Manage Agents</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-purple-600">📚</span>
                Knowledge Base
              </CardTitle>
              <CardDescription>
                Manage your knowledge and documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Upload and organize your documents for AI processing
              </p>
              <Link to="/knowledge">
                <Button className="w-full">Access Knowledge</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-orange-600">🔧</span>
                API Explorer
              </CardTitle>
              <CardDescription>Test and explore API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Explore and test the backend API directly
              </p>
              <Link to="/api">
                <Button className="w-full">Open API Explorer</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-red-600">📋</span>
                Templates
              </CardTitle>
              <CardDescription>Manage conversation templates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Create and manage conversation templates
              </p>
              <Link to="/templates">
                <Button className="w-full">Manage Templates</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-indigo-600">🔗</span>
                MCP Servers
              </CardTitle>
              <CardDescription>Manage MCP server connections</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Connect and manage MCP servers
              </p>
              <Link to="/mcp">
                <Button className="w-full">Manage MCP</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 bg-white rounded-lg px-4 py-2 shadow-sm">
            <Badge variant="secondary">Status</Badge>
            <span className="text-sm text-gray-600">
              {isAuthenticated ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

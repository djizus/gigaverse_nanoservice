import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useParams,
  useNavigate,
  useSearch,
  Link,
} from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Message, Session } from '@/types/session';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
// import { useRealTimeMessages } from "@/hooks/useRealTimeMessages"; // Temporarily disabled
import { AgentService } from '@/services/agent.service';
import { Agent } from '@/types/agent';
import { useAgentsStore } from '@/stores/agents.store';
import { MemoryService } from '@/services/memory.service';
import {
  MessageCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  History,
  MessageSquare,
  Clock,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConversationService } from '@/services/conversation.service';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const agentId = params.agentId as string | undefined;

  // Get sessionId from search params
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return ((search as Record<string, unknown>)?.sessionId as string) || null;
  });

  // Agent store
  const agents = useAgentsStore((state) => state.agents);
  const loadAgents = useAgentsStore((state) => state.loadAgents);
  //const agentsLoading = useAgentsStore((state) => state.isLoading);
  //const storeSelectedAgent = useAgentsStore((state) => state.selectedAgent);
  //const setStoreSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);

  // Local state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agentId || '');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sessions state
  const [agentSessions, setAgentSessions] = useState<Record<string, Session[]>>(
    {},
  );
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [sessionsLoading, setSessionsLoading] = useState<
    Record<string, boolean>
  >({});
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { isStreaming, startStreaming } = useStreamingResponse({
    onMessageUpdate: (message) => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          return [...prev.slice(0, -1), message];
        }
        return [...prev, message];
      });
    },
  });

  // Temporarily disable real-time messages due to incorrect API calls
  const isConnected = false;
  // const { isConnected } = useRealTimeMessages({
  //   sessionId: selectedSession?.id || "",
  //   onNewMessage: (message) => {
  //     setMessages(prev => [...prev, message]);
  //   },
  //   enabled: !!selectedSession?.id,
  // });

  const loadAgent = useCallback(async () => {
    if (!agentId) return;

    try {
      const agent = await AgentService.getAgent(agentId);
      setSelectedAgent(agent);
    } catch (error) {
      console.error('Error loading agent:', error);
    }
  }, [agentId]);

  const loadSessionMessages = useCallback(async () => {
    if (!agentId || !sessionId) {
      setSelectedSession(null);
      setMessages([]);
      return;
    }

    // Clear messages immediately to avoid showing old messages
    setMessages([]);
    setSelectedSession(null);

    try {
      setIsLoading(true);

      // First, validate that this session belongs to this agent
      const sessionData = await MemoryService.getSessionInfo(
        agentId,
        sessionId,
      );

      if (sessionData && sessionData.agentId !== agentId) {

        navigate({
          to: `/chat/${agentId}`,
          search: {},
        });
        return;
      }


      if (sessionData) {
        setSelectedSession(sessionData);
        if (sessionData.messages && sessionData.messages.length > 0) {
          setMessages(sessionData.messages);
        } else {
          // Fallback: get messages via getConversationMessages
          const messages = await MemoryService.getConversationMessages(
            agentId,
            sessionId,
          );
          setMessages(messages || []);
        }
      } else {
        setSelectedSession(null);
        setMessages([]);
      }
    } catch (error) {
      setMessages([]);
      setSelectedSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, sessionId, navigate]);

  useEffect(() => {
    // Always clear messages immediately when agent or session changes
    setMessages([]);
    setSelectedSession(null);

    if (agentId) {
      loadAgent();

      // If there's a sessionId, load the session messages
      if (sessionId) {
        loadSessionMessages();
      }
    } else {
      // Load agents list when no specific agent is selected
      loadAgents();
    }
  }, [agentId, sessionId, loadAgents, loadAgent, loadSessionMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentId, selectedSession?.id]);

  // Update sessionId when search params change
  useEffect(() => {
    const newSessionId =
      ((search as Record<string, unknown>)?.sessionId as string) || null;
    if (newSessionId !== sessionId) {
      setSessionId(newSessionId);
    }
  }, [search, sessionId, agentId]);

  const loadAgentSessions = async (agentId: string, forceReload = false) => {
    if (!forceReload && (agentSessions[agentId] || sessionsLoading[agentId])) {
      return;
    }

    setSessionsLoading((prev) => ({ ...prev, [agentId]: true }));
    try {
      const sessions = await MemoryService.getConversations(agentId);
      setAgentSessions((prev) => ({ ...prev, [agentId]: sessions }));
    } catch (error) {
      setAgentSessions((prev) => ({ ...prev, [agentId]: [] }));
    } finally {
      setSessionsLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  const toggleAgentExpansion = async (agentId: string) => {
    const isCurrentlyExpanded = expandedAgents.has(agentId);
    const newExpanded = new Set(expandedAgents);
    if (isCurrentlyExpanded) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
      // Load sessions when expanding
      await loadAgentSessions(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  const handleAgentSelection = async (selectedAgentId: string) => {
    // If clicking the same agent, just expand/collapse
    if (agentId === selectedAgentId) {
      toggleAgentExpansion(selectedAgentId);
      return;
    }

    try {
      // Load sessions directly from the service to get fresh data
      // Set loading state for this agent
      setSessionsLoading((prev) => ({ ...prev, [selectedAgentId]: true }));

      const sessions = await MemoryService.getConversations(selectedAgentId);

      // Validate that all sessions belong to this agent
      const invalidSessions = sessions.filter(
        (session) => session.agentId !== selectedAgentId,
      );
      if (invalidSessions.length > 0) {
        // Filter out invalid sessions
        const validSessions = sessions.filter(
          (session) => session.agentId === selectedAgentId,
        );
        setAgentSessions((prev) => ({
          ...prev,
          [selectedAgentId]: validSessions,
        }));

        if (validSessions.length > 0) {
          const firstSession = validSessions[0];
          navigate({
            to: `/chat/${selectedAgentId}`,
            search: { sessionId: firstSession.id },
          });
        } else {
          navigate({ to: `/chat/${selectedAgentId}` });
        }
      } else {
        // Update the sessions in state for display in sidebar
        setAgentSessions((prev) => ({ ...prev, [selectedAgentId]: sessions }));

        // If agent has sessions, navigate to the first one
        if (sessions.length > 0) {
          const firstSession = sessions[0];
          navigate({
            to: `/chat/${selectedAgentId}`,
            search: { sessionId: firstSession.id },
          });
        } else {
          // No sessions, navigate to agent without sessionId (ready to create new session)
          navigate({ to: `/chat/${selectedAgentId}` });
        }
      }

      // Auto-expand this agent to show sessions
      if (!expandedAgents.has(selectedAgentId)) {
        const newExpanded = new Set(expandedAgents);
        newExpanded.add(selectedAgentId);
        setExpandedAgents(newExpanded);
      }
    } catch (error) {
      // Fallback: navigate to agent without sessionId
      navigate({ to: `/chat/${selectedAgentId}` });
    } finally {
      // Clear loading state
      setSessionsLoading((prev) => ({ ...prev, [selectedAgentId]: false }));
    }
  };

  const handleDeleteAgent = async (agentId: string, _agentName: string) => {
    setConfirmDeleteAgent(agentId);
    setDeleteError(null);
  };

  const confirmAgentDeletion = async (agentId: string) => {
    if (!agentId) return;

    setDeletingAgent(agentId);
    setDeleteError(null);

    try {
      await AgentService.deleteAgent(agentId);

      // Refresh agents list
      await loadAgents();

      // If we're currently viewing this agent, redirect to main page
      if (params.agentId === agentId) {
        navigate({ to: '/chat' });
      }

      setConfirmDeleteAgent(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Failed to delete agent',
      );
    } finally {
      setDeletingAgent(null);
    }
  };

  const cancelAgentDeletion = () => {
    setConfirmDeleteAgent(null);
    setDeleteError(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationMessages = async (conversationId: string) => {
    if (!selectedAgentId) return;

    try {
      const messages = await ConversationService.getConversationMessages(
        selectedAgentId,
        conversationId,
      );
      setMessages(
        messages.map((msg) => {
          return {
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime(),
            rawResponse: msg.rawResponse, // Add rawResponse
          };
        }),
      );
      setSelectedConversationId(conversationId);
    } catch (error) {
      // Silently handle error
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !agentId || isLoading) {
      return;
    }

    // If no session is selected, create a new one automatically
    let currentSessionId = selectedSession?.id;
    if (!currentSessionId) {
      try {
        const newSession = await MemoryService.createSession(
          agentId,
          `Session ${new Date().toLocaleTimeString()}`,
        );

        // Update the URL to include the new session
        navigate({
          to: `/chat/${agentId}`,
          search: { sessionId: newSession.id },
        });

        // Update local state
        setSelectedSession(newSession);
        currentSessionId = newSession.id;

        // Refresh agent sessions in sidebar
        if (expandedAgents.has(agentId)) {
          await loadAgentSessions(agentId, true);
        }
      } catch (error) {
        return;
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const requestPayload = {
        content: inputMessage,
        sessionId: currentSessionId,
      };

      await startStreaming(
        agentId,
        requestPayload,
        import.meta.env.VITE_API_URL || 'http://localhost:5173',
      );
    } catch (error) {
      const errorDetails =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : { error };

      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: `Internal processing error: ${
          error instanceof Error ? error.message : 'Invalid response data.'
        }`,
        timestamp: Date.now(),
        rawResponse:
          error instanceof Error
            ? [
                {
                  id: `error-${Date.now()}`,
                  ref: 'error',
                  type: 'error',
                  data: errorDetails,
                  content: error.message,
                },
              ]
            : undefined,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with agents and sessions */}
      <div className="w-80 border-r bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Agents</h2>
        </div>

        {!agentId ? (
          agents.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">No agents</p>
              <Button size="sm" onClick={() => navigate({ to: '/agents' })}>
                Create an agent
              </Button>
            </div>
          ) : (
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0 p-2">
              {agents.map((agent) => (
                <div key={agent.id} className="space-y-1">
                  <Card
                    className={`group cursor-pointer hover:bg-accent transition-colors ${
                      agentId === agent.id ? 'bg-accent border-primary' : ''
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAgentExpansion(agent.id);
                            }}
                          >
                            {expandedAgents.has(agent.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              agent.config?.status === 'active'
                                ? 'bg-green-500'
                                : 'bg-gray-500'
                            }`}
                          />
                          <span
                            className="font-medium text-sm cursor-pointer flex items-center flex-1"
                            onClick={() => handleAgentSelection(agent.id)}
                          >
                            {agent.config?.name ||
                              `Agent ${agent.id.substring(0, 8)}...`}
                            {sessionsLoading[agent.id] && (
                              <div className="ml-2 text-xs text-muted-foreground animate-pulse">
                                Loading...
                              </div>
                            )}
                          </span>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAgent(
                              agent.id,
                              agent.config?.name ||
                                `Agent ${agent.id.substring(0, 8)}...`,
                            );
                          }}
                          disabled={deletingAgent === agent.id}
                        >
                          {deletingAgent === agent.id ? (
                            <div className="animate-spin h-3 w-3 border border-muted-foreground border-t-transparent rounded-full" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {agent.config?.modelType || 'Unknown'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {agent.config?.modelId || 'Unknown'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sessions for this agent */}
                  {expandedAgents.has(agent.id) && (
                    <div className="ml-4 space-y-1">
                      {sessionsLoading[agent.id] ? (
                        <div className="text-xs text-muted-foreground p-2">
                          Loading sessions...
                        </div>
                      ) : agentSessions[agent.id]?.length === 0 ? (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground p-2">
                            No sessions
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({ to: `/chat/${agent.id}` });
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            New session
                          </Button>
                        </div>
                      ) : (
                        agentSessions[agent.id]?.map((session) => (
                          <Card
                            key={session.id}
                            className={`cursor-pointer hover:bg-accent/50 transition-colors border-l-2 ${
                              sessionId === session.id
                                ? 'border-l-primary bg-accent/30'
                                : 'border-l-muted'
                            }`}
                            onClick={() => {
                              navigate({
                                to: `/chat/${agent.id}`,
                                search: { sessionId: session.id },
                              });
                            }}
                          >
                            <CardContent className="p-2">
                              <div className="flex items-center space-x-2">
                                <MessageCircle className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium truncate">
                                  {session.name}
                                </span>
                              </div>
                              {session.updatedAt && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(
                                    session.updatedAt,
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}

                      {/* Add New Session button after existing sessions */}
                      {agentSessions[agent.id]?.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: `/chat/${agent.id}` });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          New session
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-4">
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate({ to: '/chat' })}
              >
                ← Back to agents
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar with conversations (only shown when agent is selected) */}
      {selectedAgentId && (
        <div
          className={`${showConversations ? 'w-80' : 'w-12'} transition-all duration-300 border-r bg-card`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              {showConversations ? (
                <>
                  <div>
                    <h3 className="font-semibold">Conversations</h3>
                    {selectedAgent && (
                      <p className="text-xs text-muted-foreground">
                        {selectedAgent.config?.name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConversations(false)}
                  >
                    ×
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConversations(true)}
                  title="Show conversations"
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
            </div>

            {showConversations && (
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setMessages([]);
                      setSelectedConversationId(null);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New conversation
                  </Button>

                  {!selectedAgentId ||
                  !agentSessions[selectedAgentId] ||
                  agentSessions[selectedAgentId].length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">
                      No conversations
                    </p>
                  ) : (
                    agentSessions[selectedAgentId].map((session) => (
                      <div key={session.id} className="space-y-1">
                        <button
                          onClick={() => loadConversationMessages(session.id)}
                          className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${
                            selectedConversationId === session.id
                              ? 'bg-accent'
                              : ''
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {session.name ||
                              `Session ${session.id.slice(0, 8)}`}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <MessageSquare className="h-3 w-3" />
                            {session.messages?.length || 0} messages
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {session.updatedAt
                              ? new Date(session.updatedAt).toLocaleDateString()
                              : new Date(
                                  session.createdAt,
                                ).toLocaleDateString()}
                          </div>
                        </button>
                        {selectedConversationId === session.id &&
                          messages.length > 0 && (
                            <div className="pl-4 border-l-2 border-accent ml-2 space-y-1">
                              {messages.slice(0, 3).map((msg, idx) => (
                                <div key={idx} className="text-xs p-1">
                                  <span className="font-medium text-muted-foreground">
                                    {msg.role === 'user' ? '👤' : '🤖'}
                                  </span>
                                  <span className="ml-1 text-muted-foreground line-clamp-1">
                                    {msg.content}
                                  </span>
                                </div>
                              ))}
                              {messages.length > 3 && (
                                <div className="text-xs text-muted-foreground p-1">
                                  ... and {messages.length - 3} other messages
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {!agentId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Select an agent</h3>
              <p className="text-muted-foreground">
                Choose an agent from the list to start a conversation
              </p>
            </div>
          </div>
        ) : (
          <Card className="flex-1 m-4 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Chat with</span>
                  {agents.length > 0 ? (
                    <Select
                      value={selectedAgentId}
                      onValueChange={setSelectedAgentId}
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.config?.name || `Agent ${agent.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">
                      Loading agents...
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <span className="text-sm text-green-600">● Connected</span>
                  )}
                  <Link to="/api">
                    <Button
                      variant="outline"
                      size="sm"
                      title="View conversation history"
                    >
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </Link>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">
                    Start a new conversation with{' '}
                    {selectedAgent?.config?.name || 'the selected agent'}
                  </p>
                  <p className="text-sm">
                    To see the complete session history, click the "History"
                    button above
                  </p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 mb-4 max-h-[calc(100vh-300px)]">
                {messages.map((message, index) => {
                  return (
                    <ChatMessage
                      key={index}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp || Date.now()}
                      rawResponse={message.rawResponse}
                      isStreaming={isStreaming && index === messages.length - 1}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedSession
                      ? 'Type your message...'
                      : 'Write your message to create a new session...'
                  }
                  className="flex-1 resize-none"
                  rows={3}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="self-end"
                >
                  {isLoading
                    ? 'Sending...'
                    : selectedSession
                      ? 'Send'
                      : 'Create session'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation dialog for agent deletion */}
      {confirmDeleteAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete agent</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this agent? This action is
              irreversible and will also delete all associated sessions.
            </p>
            {deleteError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4">
                <p className="text-destructive text-sm">{deleteError}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={cancelAgentDeletion}
                disabled={deletingAgent === confirmDeleteAgent}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmAgentDeletion(confirmDeleteAgent)}
                disabled={deletingAgent === confirmDeleteAgent}
              >
                {deletingAgent === confirmDeleteAgent ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full mr-2" />
                    Deleting...
                  </div>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

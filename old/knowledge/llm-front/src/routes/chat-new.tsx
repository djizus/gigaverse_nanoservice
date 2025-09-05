import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Message, Session } from '@/types/session';
import { Agent } from '@/types/agent';
import { AgentService } from '@/services/agent.service';
import { MemoryService } from '@/services/memory.service';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import { useAgentsStore } from '@/stores/agents.store';
import { ChatMessage } from '@/components/chat/ChatMessage';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Download,
  Settings,
  Bot,
  Send,
  Sparkles,
  Calendar,
  Brain,
  Zap,
  MessageCircle,
  FolderOpen,
  Archive,
  Star,
  RefreshCw,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';


export function ChatNewPage() {
  
  // Global store
  const { agents, loadAgents, isLoading: agentsLoading } = useAgentsStore();
  
  // Local state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isEditingAgent, setIsEditingAgent] = useState<Agent | null>(null);
  const [agentSessions, setAgentSessions] = useState<Record<string, Session[]>>({});
  const [sessionsLoading, setSessionsLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'archived'>('all');
  const [showSessionPanel, setShowSessionPanel] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<{ id: string; name: string } | null>(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Create agent form state
  const [newAgentForm, setNewAgentForm] = useState({
    name: '',
    description: '',
    modelType: 'anthropic' as 'anthropic' | 'openai',
    modelId: 'claude-3-7-sonnet-latest',
    instructions: '',
  });
  
  // Edit agent form state
  const [editAgentForm, setEditAgentForm] = useState({
    name: '',
    description: '',
    instructions: '',
  });
  
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
  
  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);
  
  // Keyboard shortcuts - moved after navigation functions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && messages.length > 0) {
        e.preventDefault();
        setShowMessageSearch(true);
      }
      
      // Escape to close search
      if (e.key === 'Escape' && showMessageSearch) {
        setShowMessageSearch(false);
        setMessageSearchQuery('');
        setSearchResults([]);
      }
      
      // Enter to go to next result when search is active
      if (e.key === 'Enter' && showMessageSearch && !e.shiftKey && searchResults.length > 0) {
        e.preventDefault();
        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        const messageIndex = searchResults[nextIndex];
        if (messageRefs.current[messageIndex]) {
          messageRefs.current[messageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setCurrentSearchIndex(nextIndex);
        }
      }
      
      // Shift + Enter to go to previous result
      if (e.key === 'Enter' && showMessageSearch && e.shiftKey && searchResults.length > 0) {
        e.preventDefault();
        const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
        const messageIndex = searchResults[prevIndex];
        if (messageRefs.current[messageIndex]) {
          messageRefs.current[messageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setCurrentSearchIndex(prevIndex);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMessageSearch, messages.length, searchResults, currentSearchIndex]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (!showMessageSearch) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showMessageSearch]);
  
  // Search messages effect
  useEffect(() => {
    if (!messageSearchQuery.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }
    
    const query = messageSearchQuery.toLowerCase();
    const results: number[] = [];
    
    messages.forEach((message, index) => {
      if (message.content.toLowerCase().includes(query)) {
        results.push(index);
      }
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    // Scroll to first result
    if (results.length > 0 && messageRefs.current[results[0]]) {
      messageRefs.current[results[0]]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [messageSearchQuery, messages]);
  
  // Navigation functions for search
  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    const messageIndex = searchResults[nextIndex];
    if (messageRefs.current[messageIndex]) {
      messageRefs.current[messageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentSearchIndex(nextIndex);
    }
  };
  
  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    const messageIndex = searchResults[prevIndex];
    if (messageRefs.current[messageIndex]) {
      messageRefs.current[messageIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentSearchIndex(prevIndex);
    }
  };
  
  // Load sessions for an agent
  const loadAgentSessions = useCallback(async (agentId: string) => {
    if (sessionsLoading[agentId]) return;
    
    setSessionsLoading(prev => ({ ...prev, [agentId]: true }));
    try {
      const sessions = await MemoryService.getConversations(agentId);
      setAgentSessions(prev => ({ ...prev, [agentId]: sessions }));
      return sessions;
    } catch (error) {
      console.error('Error loading sessions:', error);
      setAgentSessions(prev => ({ ...prev, [agentId]: [] }));
      return [];
    } finally {
      setSessionsLoading(prev => ({ ...prev, [agentId]: false }));
    }
  }, [sessionsLoading]);
  
  // Select a session
  const handleSelectSession = useCallback(async (session: Session) => {
    setSelectedSession(session);
    setMessages([]);
    
    try {
      // Load session messages from memory service
      const messages = await MemoryService.getConversationMessages(
        session.agentId,
        session.id
      );
      
      if (messages && messages.length > 0) {
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  }, []);
  
  // Select an agent
  const handleSelectAgent = useCallback(async (agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedSession(null);
    setMessages([]);
    
    // Load sessions for this agent
    if (!agentSessions[agent.id] && !sessionsLoading[agent.id]) {
      const sessions = await loadAgentSessions(agent.id);
      
      // Auto-select first session if available
      if (sessions && sessions.length > 0) {
        await handleSelectSession(sessions[0]);
      }
    } else if (agentSessions[agent.id] && agentSessions[agent.id].length > 0) {
      // Sessions already loaded, select first one
      await handleSelectSession(agentSessions[agent.id][0]);
    }
  }, [agentSessions, sessionsLoading, loadAgentSessions, handleSelectSession]);
  
  // Create new agent
  const handleCreateAgent = async () => {
    try {
      const newAgent = await AgentService.createAgent({
        modelType: newAgentForm.modelType,
        modelId: newAgentForm.modelId,
        name: newAgentForm.name,
        description: newAgentForm.description,
        instructions: newAgentForm.instructions,
        contexts: ['chat'],
      });
      
      await loadAgents();
      setIsCreatingAgent(false);
      setNewAgentForm({
        name: '',
        description: '',
        modelType: 'anthropic',
        modelId: 'claude-3-7-sonnet-latest',
        instructions: '',
      });
      
      // Auto-select the new agent
      if (newAgent) {
        handleSelectAgent(newAgent);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };
  
  // Update agent
  const handleUpdateAgent = async () => {
    if (!isEditingAgent) return;
    
    try {
      await AgentService.updateAgent(isEditingAgent.id, {
        name: editAgentForm.name,
        description: editAgentForm.description,
        instructions: editAgentForm.instructions,
      });
      
      await loadAgents();
      setIsEditingAgent(null);
      
      // Update selected agent if it's the one being edited
      if (selectedAgent?.id === isEditingAgent.id) {
        const updatedAgent = await AgentService.getAgent(isEditingAgent.id);
        setSelectedAgent(updatedAgent);
      }
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };
  
  // Delete agent
  const handleDeleteAgent = async (agentId: string) => {
    try {
      await AgentService.deleteAgent(agentId);
      await loadAgents();
      
      // Clear selection if deleted agent was selected
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setSelectedSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };
  
  // Delete session
  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    setConfirmDeleteSession({ id: sessionId, name: sessionName });
  };
  
  const confirmSessionDeletion = async () => {
    if (!confirmDeleteSession || !selectedAgent) return;
    
    const sessionId = confirmDeleteSession.id;
    setDeletingSessionId(sessionId);
    
    try {
      await MemoryService.deleteConversation(selectedAgent.id, sessionId);
      
      // Update sessions list
      setAgentSessions(prev => ({
        ...prev,
        [selectedAgent.id]: prev[selectedAgent.id].filter(s => s.id !== sessionId)
      }));
      
      // Clear selection if deleted session was selected
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
        
        // Select another session if available
        const remainingSessions = agentSessions[selectedAgent.id]?.filter(s => s.id !== sessionId);
        if (remainingSessions && remainingSessions.length > 0) {
          await handleSelectSession(remainingSessions[0]);
        }
      }
      
      setConfirmDeleteSession(null);
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setDeletingSessionId(null);
    }
  };
  
  const cancelSessionDeletion = () => {
    setConfirmDeleteSession(null);
  };
  
  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedAgent || isStreaming) return;
    
    let currentSessionId = selectedSession?.id;
    let isNewSession = false;
    
    // Create new session if needed
    if (!currentSessionId) {
      try {
        const newSession = await MemoryService.createSession(
          selectedAgent.id,
          `Chat ${new Date().toLocaleTimeString()}`
        );
        setSelectedSession(newSession);
        currentSessionId = newSession.id;
        isNewSession = true;
        
        // Add the new session to the sessions list
        setAgentSessions(prev => ({
          ...prev,
          [selectedAgent.id]: [newSession, ...(prev[selectedAgent.id] || [])]
        }));
      } catch (error) {
        console.error('Error creating session:', error);
        return;
      }
    }
    
    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    try {
      await startStreaming(
        selectedAgent.id,
        {
          content: inputMessage,
          sessionId: currentSessionId,
        },
        import.meta.env.VITE_API_URL || 'http://localhost:5173'
      );
      
      // Update session's last message in the sessions list
      if (!isNewSession) {
        setAgentSessions(prev => {
          const sessions = prev[selectedAgent.id] || [];
          return {
            ...prev,
            [selectedAgent.id]: sessions.map(s => 
              s.id === currentSessionId 
                ? { ...s, updatedAt: Date.now() }
                : s
            )
          };
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  
  // Filter agents based on search and tab
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = !searchQuery || 
      agent.config?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.config?.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'active' && agent.config?.status === 'active') ||
      (activeTab === 'archived' && agent.config?.status === 'inactive');
    
    return matchesSearch && matchesTab;
  });
  
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Agents Panel */}
        <div className="w-80 border-r bg-card/50 backdrop-blur-sm flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-background/95">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">AI Agents</h2>
                <Badge variant="secondary" className="ml-2">
                  {agents.length}
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreatingAgent(true)}
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
            
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Model Type</DropdownMenuItem>
                  <DropdownMenuItem>Status</DropdownMenuItem>
                  <DropdownMenuItem>Last Active</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
              <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-2">
                  {agentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No agents found' : 'No agents yet'}
                      </p>
                      {!searchQuery && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setIsCreatingAgent(true)}
                          className="mt-2"
                        >
                          Create your first agent
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className={cn(
                          "group relative p-3 rounded-lg border cursor-pointer transition-all",
                          "hover:bg-accent/50 hover:border-primary/50",
                          selectedAgent?.id === agent.id && "bg-accent border-primary"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              agent.config?.status === 'active' ? "bg-green-500" : "bg-gray-500"
                            )} />
                            <span className="font-medium text-sm">
                              {agent.config?.name || `Agent ${agent.id.slice(0, 8)}`}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditAgentForm({
                                    name: agent.config?.name || '',
                                    description: agent.config?.description || '',
                                    instructions: agent.config?.instructions || '',
                                  });
                                  setIsEditingAgent(agent);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Clone agent logic here
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Clone
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAgent(agent.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {agent.config?.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {agent.config.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {agent.config?.modelType || 'Unknown'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {agent.config?.modelId?.split('-').slice(-1)[0] || 'Unknown'}
                          </Badge>
                          {agentSessions[agent.id] && (
                            <Badge variant="outline" className="text-xs ml-auto">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {agentSessions[agent.id].length}
                            </Badge>
                          )}
                        </div>
                        
                        {sessionsLoading[agent.id] && (
                          <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {!selectedAgent ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mb-6 relative">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/20" />
                  <Sparkles className="h-6 w-6 absolute top-0 right-1/3 text-primary/50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
                <p className="text-muted-foreground mb-6">
                  Select an agent from the sidebar or create a new one to begin chatting
                </p>
                <Button onClick={() => setIsCreatingAgent(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Agent
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="border-b bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                        selectedAgent.config?.status === 'active' ? "bg-green-500" : "bg-gray-500"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedAgent.config?.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {selectedAgent.config?.modelType}
                        </Badge>
                        {selectedSession && (
                          <>
                            <span>•</span>
                            <span>{selectedSession.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Search Bar */}
                    {showMessageSearch ? (
                      <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          value={messageSearchQuery}
                          onChange={(e) => setMessageSearchQuery(e.target.value)}
                          placeholder="Search messages..."
                          className="h-7 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                          autoFocus
                        />
                        {searchResults.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{currentSearchIndex + 1}/{searchResults.length}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={prevSearchResult}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={nextSearchResult}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setShowMessageSearch(false);
                            setMessageSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowMessageSearch(true)}
                            disabled={messages.length === 0}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-col gap-1">
                            <span>Search Messages</span>
                            <span className="text-xs text-muted-foreground">Ctrl+F</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSessionPanel(!showSessionPanel)}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {showSessionPanel ? 'Hide' : 'Show'} Sessions
                      </TooltipContent>
                    </Tooltip>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Export Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Session
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Clear Messages
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
              
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                      <h4 className="font-medium mb-2">No messages yet</h4>
                      <p className="text-sm text-muted-foreground">
                        Send a message to start the conversation
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {messages.map((message, index) => {
                      const isSearchResult = searchResults.includes(index);
                      const isCurrentResult = searchResults[currentSearchIndex] === index;
                      
                      return (
                        <div
                          key={index}
                          ref={(el) => { messageRefs.current[index] = el; }}
                          className={cn(
                            "transition-all duration-200",
                            isSearchResult && "ring-2 ring-primary/30 rounded-lg",
                            isCurrentResult && "ring-primary bg-primary/5"
                          )}
                        >
                          <ChatMessage
                            role={message.role}
                            content={message.content}
                            timestamp={message.timestamp || Date.now()}
                            rawResponse={message.rawResponse}
                            isStreaming={isStreaming && index === messages.length - 1}
                          />
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {/* Input Area */}
              <div className="border-t bg-card/50 backdrop-blur-sm p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 min-h-[60px] max-h-[200px] resize-none"
                      disabled={isStreaming}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isStreaming}
                        className="h-[60px]"
                      >
                        {isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8">
                        <Zap className="h-4 w-4 mr-1" />
                        Templates
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8">
                        <Brain className="h-4 w-4 mr-1" />
                        Context
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Press <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> to send
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Sessions Panel */}
        {selectedAgent && showSessionPanel && (
          <div className="w-80 border-l bg-card/50 backdrop-blur-sm flex flex-col">
            <div className="p-4 border-b bg-background/95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Sessions</h3>
                  <Badge variant="secondary">
                    {agentSessions[selectedAgent.id]?.length || 0}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedAgent) return;
                    const newSession = await MemoryService.createSession(
                      selectedAgent.id,
                      `Session ${new Date().toLocaleTimeString()}`
                    );
                    await loadAgentSessions(selectedAgent.id);
                    handleSelectSession(newSession);
                  }}
                  className="h-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {!agentSessions[selectedAgent.id] || agentSessions[selectedAgent.id].length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No sessions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Send a message to start
                    </p>
                  </div>
                ) : (
                  agentSessions[selectedAgent.id].map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        "hover:bg-accent/50 hover:border-primary/50",
                        selectedSession?.id === session.id && "bg-accent border-primary"
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm line-clamp-1">
                          {session.name || `Session ${session.id.slice(0, 8)}`}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 hover:opacity-100"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-3 w-3 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Star className="h-3 w-3 mr-2" />
                              Favorite
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Archive className="h-3 w-3 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(
                                  session.id,
                                  session.name || `Session ${session.id.slice(0, 8)}`
                                );
                              }}
                              disabled={deletingSessionId === session.id}
                            >
                              {deletingSessionId === session.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{session.messages?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {session.createdAt
                              ? new Date(session.createdAt).toLocaleDateString()
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      {session.messages && session.messages.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {session.messages[session.messages.length - 1].content}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
        
        {/* Create Agent Dialog */}
        <Dialog open={isCreatingAgent} onOpenChange={setIsCreatingAgent}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Configure your AI agent's capabilities and behavior
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="name"
                  value={newAgentForm.name}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Customer Support Agent"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newAgentForm.description}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="modelType" className="text-sm font-medium">
                    Model Provider
                  </label>
                  <select
                    id="modelType"
                    value={newAgentForm.modelType}
                    onChange={(e) => setNewAgentForm(prev => ({ 
                      ...prev, 
                      modelType: e.target.value as 'anthropic' | 'openai' 
                    }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="modelId" className="text-sm font-medium">
                    Model
                  </label>
                  <select
                    id="modelId"
                    value={newAgentForm.modelId}
                    onChange={(e) => setNewAgentForm(prev => ({ ...prev, modelId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    {newAgentForm.modelType === 'anthropic' ? (
                      <>
                        <option value="claude-3-7-sonnet-latest">Claude 3.5 Sonnet</option>
                        <option value="claude-3-opus-latest">Claude 3 Opus</option>
                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="instructions" className="text-sm font-medium">
                  System Instructions
                </label>
                <Textarea
                  id="instructions"
                  value={newAgentForm.instructions}
                  onChange={(e) => setNewAgentForm(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Define the agent's behavior and capabilities..."
                  rows={4}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingAgent(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAgent}>
                Create Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Agent Dialog */}
        <Dialog open={!!isEditingAgent} onOpenChange={() => setIsEditingAgent(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Agent</DialogTitle>
              <DialogDescription>
                Update your agent's configuration
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="edit-name"
                  value={editAgentForm.name}
                  onChange={(e) => setEditAgentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Agent name"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="edit-description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="edit-description"
                  value={editAgentForm.description}
                  onChange={(e) => setEditAgentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this agent do?"
                  rows={2}
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="edit-instructions" className="text-sm font-medium">
                  System Instructions
                </label>
                <Textarea
                  id="edit-instructions"
                  value={editAgentForm.instructions}
                  onChange={(e) => setEditAgentForm(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Define the agent's behavior..."
                  rows={4}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingAgent(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAgent}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Session Confirmation Dialog */}
        {confirmDeleteSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete Session</h3>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete "{confirmDeleteSession.name}"? 
                This will permanently remove all messages in this session.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={cancelSessionDeletion}
                  disabled={deletingSessionId === confirmDeleteSession.id}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmSessionDeletion}
                  disabled={deletingSessionId === confirmDeleteSession.id}
                >
                  {deletingSessionId === confirmDeleteSession.id ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </div>
                  ) : (
                    'Delete Session'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
export interface ServiceManifest {
  developer: string
  serviceId: string
  name: string
  version: string
  summary?: string
  capabilities: string[]
  uiSchema?: { fields?: Array<any> }
}

export interface RunSummary {
  id: string
  status: 'started' | 'processing' | 'completed' | 'failed' | 'aborted'
  service_id?: string
  developer?: string
  details?: RunEvent[]
  created_at: string
  updated_at: string
}

export interface RunEvent {
  event_type: string
  message: string
  event_data?: Record<string, any>
  timestamp: string
}

export interface AgentConfig {
  id: string
  name: string
  model: string
  context: string
  description?: string
  instructions?: string
  status: 'active' | 'archived'
}

export interface Session {
  id: string
  agentId: string
  title?: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  sessionId: string
  agentId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  createdAt: string
}

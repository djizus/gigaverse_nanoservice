export interface OrchestratorPort {
  ensureServiceAgent(nameHint?: string): Promise<{ agentId: string }>;
  ensureRunSession(agentId: string, runId: string): Promise<{ sessionId: string }>;
  sendMessage(agentId: string, sessionId: string, message: string, opts?: { temperature?: number; context?: any }): Promise<{ text: string; tokens?: number }>; 
}


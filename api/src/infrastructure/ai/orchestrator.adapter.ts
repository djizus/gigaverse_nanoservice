import { OrchestratorPort } from '../../shared/ports/orchestrator.port';
import { AgentService } from '../../daydreams/services/agent.service';

export class OrchestratorAdapter implements OrchestratorPort {
  private cachedAgentId?: string;
  constructor(private agents: AgentService, private serviceName: string, private defaultModel?: string, private defaultInstructions?: string) {}

  async ensureServiceAgent(nameHint?: string): Promise<{ agentId: string }> {
    if (this.cachedAgentId) return { agentId: this.cachedAgentId };
    const name = nameHint || this.serviceName;
    // Try to find existing agent by name
    try {
      const list = await this.agents.listAgents();
      const found = list.find(a => (a.name || '').toLowerCase() === name.toLowerCase());
      if (found) {
        this.cachedAgentId = found.id;
        return { agentId: found.id };
      }
    } catch {}
    // Create new agent
    const agent = await this.agents.createAgent({
      name,
      model: this.defaultModel || 'google-vertex/gemini-2.5-flash',
      context: 'gigaverse',
      description: `${name} orchestrator`,
      instructions: this.defaultInstructions || `You orchestrate ${this.serviceName} runs. Be concise and tactical.`,
    });
    this.cachedAgentId = agent.id;
    return { agentId: agent.id };
  }

  async ensureRunSession(agentId: string, runId: string): Promise<{ sessionId: string }> {
    const session = await this.agents.ensureSession(agentId);
    // Optionally, we could tag session with runId via meta if supported
    return { sessionId: session.id };
  }

  async sendMessage(agentId: string, sessionId: string, message: string, opts?: { temperature?: number; context?: any }): Promise<{ text: string; tokens?: number }>{
    // Fetch agent and session, then use AgentService.sendMessage(agent, session, content)
    const agent = await this.agents.getAgent(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);
    let session = await this.agents.getSession(sessionId);
    if (!session) {
      session = await this.agents.ensureSession(agentId, sessionId);
    }
    const { reply } = await this.agents.sendMessage(agent, session, message, { context: opts?.context });
    return { text: reply.content };
  }
}

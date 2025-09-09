import { DatabaseService } from '../../infrastructure/database/database.service';
import { RunRepositoryAdapter } from '../../infrastructure/database/adapters/run-repository.adapter';
import { EventBusAdapter } from '../../infrastructure/events/event-bus.adapter';
import { OrchestratorAdapter } from '../../infrastructure/ai/orchestrator.adapter';
import { AgentService } from '../../daydreams/services/agent.service';

export function buildPorts(deps: { db: DatabaseService; agents: AgentService; serviceName: string; defaultModel?: string; orchestratorName?: string; }) {
  const runRepo = new RunRepositoryAdapter(deps.db);
  const eventBus = new EventBusAdapter();
  const orchestrator = new OrchestratorAdapter(deps.agents, deps.serviceName, deps.defaultModel);

  async function ensureAgent() {
    const { agentId } = await orchestrator.ensureServiceAgent(deps.orchestratorName || deps.serviceName);
    return agentId;
  }

  return { runRepo, eventBus, orchestrator, ensureAgent };
}


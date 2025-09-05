import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion } from '@/components/ui/accordion';
import { Agent } from '@/types/agent';

interface AgentDetailsModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentDetailsModal({
  agent,
  isOpen,
  onClose,
}: AgentDetailsModalProps) {
  if (!agent || !agent.config) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const status = agent.config.status || 'unknown';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 space-y-0 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Agent Details
              <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                {status}
              </Badge>
            </DialogTitle>
            <div className="text-sm text-muted-foreground">ID: {agent.id}</div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-4">
            {/* Basic Information and Stats in a grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Left column - Basic Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Basic Information</h3>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <div className="text-muted-foreground">Model Type:</div>
                  <div>{agent.config.modelType}</div>
                  <div className="text-muted-foreground">Model ID:</div>
                  <div>{agent.config.modelId}</div>
                </div>
              </div>

              {/* Right column - Stats */}
              {agent.config.stats && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Statistics</h3>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Conversations:</div>
                    <div>{agent.config.stats.totalConversations}</div>
                    <div className="text-muted-foreground">Response Time:</div>
                    <div>{agent.config.stats.averageResponseTime}ms</div>
                    <div className="text-muted-foreground">Success Rate:</div>
                    <div>{agent.config.stats.successRate}%</div>
                    <div className="text-muted-foreground">Last Active:</div>
                    <div>{formatDate(agent.config.stats.lastActive)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Capabilities - commented out for now */}

            {/* Contexts and Templates */}
            {agent.config.contexts && agent.config.contexts.length > 0 && (
              <Accordion
                type="single"
                collapsible
                className="w-full"
                items={[
                  {
                    value: 'contexts',
                    title: 'Contexts and Templates',
                    content: (
                      <div className="space-y-4">
                        {agent.config.contexts.map((contextId) => {
                          const contextArgs =
                            agent.config.contextArgs?.[contextId];
                          const template = contextArgs?.template;

                          return (
                            <div
                              key={contextId}
                              className="mb-4 p-4 border rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold">
                                  Context: {contextId}
                                </h4>
                                <div className="flex gap-3 text-sm text-muted-foreground">
                                  <span>Session: {contextArgs?.sessionId}</span>
                                  <span>User: {contextArgs?.userId}</span>
                                </div>
                              </div>

                              {template && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <div>
                                      <span className="font-medium">
                                        Template:
                                      </span>{' '}
                                      {template.name}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {template.description}
                                    </div>
                                  </div>

                                  {template.variables &&
                                    template.variables.length > 0 && (
                                      <div>
                                        <h6 className="text-sm font-medium mb-2">
                                          Variables
                                        </h6>
                                        <div className="grid grid-cols-3 gap-2">
                                          {template.variables.map(
                                            (variable) => (
                                              <div
                                                key={variable.name}
                                                className="p-2 bg-muted rounded text-xs"
                                              >
                                                <div className="font-medium">
                                                  {variable.name}
                                                </div>
                                                <div className="text-muted-foreground text-[10px]">
                                                  {variable.description}
                                                </div>
                                                {variable.defaultValue && (
                                                  <div className="mt-1 text-[10px] text-muted-foreground italic">
                                                    {variable.defaultValue}
                                                  </div>
                                                )}
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {template.content && (
                                    <div>
                                      <h6 className="text-sm font-medium mb-2">
                                        Content
                                      </h6>
                                      <div className="rounded-md border p-4">
                                        <pre className="text-xs whitespace-pre-wrap">
                                          {template.content}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import des composants de tab
import { SessionsTab } from './tabs/SessionsTab';
import { AgentsTab } from './tabs/AgentsTab';
import { ContextsTab } from './tabs/ContextsTab';
import { Agent } from '@/types/agent';

interface Session {
  id: string;
  name: string;
  createdAt: number;
}

interface SessionSidebarProps {
  sessions: Session[];
  selectedSession: Session | null;
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectSession: (session: Session) => void;
  onSelectAgent: (agent: Agent) => void;
  onCreateSession: (name: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

export function SessionSidebar({
  sessions,
  selectedSession,
  agents,
  selectedAgent,
  onSelectSession,
  onSelectAgent,
  onCreateSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="w-[48rem] h-full border-r bg-card p-6 flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="contexts">Contextes & Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <SessionsTab
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={onSelectSession}
            onCreateSession={onCreateSession}
            onDeleteSession={onDeleteSession}
          />
        </TabsContent>

        <TabsContent value="agents">
          <AgentsTab
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={onSelectAgent}
          />
        </TabsContent>

        <TabsContent value="contexts">
          <ContextsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

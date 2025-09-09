import React from 'react';
import { GlobalAgent } from '../agent/global-agent';

type Page = 'dashboard' | 'services' | 'runs' | 'agents' | 'settings';

export interface GlobalAgentAPI {
  agent: GlobalAgent;
  execute: (input: string) => Promise<{ summary: string }>; // minimal surface now
  suggest: (input: string) => Promise<string[]>;
}

export const GlobalAgentContext = React.createContext<GlobalAgentAPI | null>(null);

export function useGlobalAgent() {
  const ctx = React.useContext(GlobalAgentContext);
  if (!ctx) throw new Error('GlobalAgentContext unavailable');
  return ctx;
}

export function GlobalAgentProvider({
  children,
  navigate,
  openServiceLauncher,
  focusAgentChat,
}: {
  children: React.ReactNode;
  navigate: (page: Page) => void;
  openServiceLauncher: (service: any, initialForm?: Record<string, any>) => void;
  focusAgentChat: (agentId: string) => void;
}) {
  const agent = React.useMemo(() => new GlobalAgent({ navigate, openServiceLauncher, focusAgentChat }), [navigate, openServiceLauncher, focusAgentChat]);

  const api: GlobalAgentAPI = React.useMemo(() => ({
    agent,
    execute: async (input: string) => {
      const res = await agent.handle(input);
      return { summary: res.summary };
    },
    suggest: (input: string) => agent.suggest(input),
  }), [agent]);

  return (
    <GlobalAgentContext.Provider value={api}>{children}</GlobalAgentContext.Provider>
  );
}


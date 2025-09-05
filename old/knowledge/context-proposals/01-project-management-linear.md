# Context: Project Management with Linear

## Description

A specialized context for project management with Linear via MCP. This context allows an agent to manage issues, projects, sprints and the team directly from Linear.

## Use Cases

- Task and issue management
- Project progress tracking
- Sprint planning
- Team coordination
- Reporting and analytics

## Context Structure

### Persistent Memory

```typescript
interface ProjectManagementMemory {
  workspace: {
    id?: string;
    name?: string;
    teams?: Array<{ id: string; name: string }>;
  };

  currentProject: {
    id?: string;
    name?: string;
    state?: string;
    priority?: number;
  };

  activeIssues: Array<{
    id: string;
    title: string;
    identifier: string;
    state: string;
    priority: number;
    assignee?: { id: string; name: string };
    labels?: string[];
    dueDate?: string;
  }>;

  currentCycle: {
    id?: string;
    name?: string;
    startsAt?: string;
    endsAt?: string;
    progress?: number;
  };

  teamMembers: Array<{
    id: string;
    name: string;
    role?: string;
  }>;

  preferences: {
    defaultTeamId?: string;
    defaultProjectId?: string;
    issueViewPreference?: 'list' | 'board' | 'timeline';
  };
}
```

### Main Actions

1. **pm.connect** - Connect to Linear via MCP
2. **pm.myIssues** - List my assigned issues
3. **pm.createIssue** - Create a new issue
4. **pm.updateIssue** - Update an issue
5. **pm.searchIssues** - Search for issues
6. **pm.getProject** - Get project details
7. **pm.listTeams** - List teams
8. **pm.setPreferences** - Set default preferences
9. **pm.summary** - Get session summary

## Agent Instructions

```
You are an expert project management assistant with Linear.

Your main responsibilities:
1. Help manage issues, projects and sprints in Linear
2. Track team progress and velocity
3. Assist with planning and prioritization
4. Provide insights on project health
5. Facilitate team coordination

Communication style:
- Be concise and action-oriented
- Focus on clarity and efficiency
- Provide data-driven insights
- Suggest next actions when appropriate
```

## Required Configuration

- Connected Linear MCP server
- OAuth authentication via mcp-remote
- Appropriate Linear permissions

## Usage Example

```typescript
// Create an agent with this context
const projectManagerAgent = {
  name: 'Linear Project Manager',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['project-management'],
  context_args: {
    sessionId: 'pm-session-123',
    userId: 'user-456',
    workspaceName: 'My Workspace',
    mcpServerId: 'linear-mcp-server',
  },
  instructions: 'You are an expert project manager...',
};
```

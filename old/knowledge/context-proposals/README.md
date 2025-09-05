# Custom Context Proposals

This folder contains proposals for specialized contexts to extend your AI agents' capabilities. Each context is designed for a specific domain of expertise.

## Available Contexts

### 1. [Project Management with Linear](01-project-management-linear.md)

Agile project management with Linear integration via MCP. Manage issues, sprints, and teams.

### 2. [Code Review with GitHub](02-code-review-github.md)

Thorough code review with GitHub pull request analysis. Bug detection, optimization suggestions.

### 3. [Documentation Writer](03-documentation-writer.md)

Technical documentation creation and maintenance. Automatic generation of API docs, guides, tutorials.

### 4. [DevOps Kubernetes Manager](04-devops-kubernetes.md)

Kubernetes infrastructure management. Deployment, monitoring, scaling and debugging of K8s clusters.

### 5. [Data Analyst SQL](05-data-analyst-sql.md)

Data analysis with SQL. Complex queries, reports, optimization and visualizations.

### 6. [Security Auditor](06-security-auditor.md)

Comprehensive security audits. Vulnerability scanning, compliance testing, detailed reports.

### 7. [Test Automation Engineer](07-test-automation.md)

Automated test creation and maintenance. Unit, integration, E2E and performance tests.

### 8. [API Designer](08-api-designer.md)

RESTful and GraphQL API design. OpenAPI documentation, SDK generation, versioning.

## Common Structure

Each context follows a similar structure:

1. **Description** - Context overview
2. **Use Cases** - Typical usage scenarios
3. **Memory Structure** - Persistent state maintained by the context
4. **Main Actions** - Available commands for the agent
5. **Instructions** - Behavior guide for the agent
6. **Required Configuration** - Technical prerequisites
7. **Usage Example** - Code to implement the context

## How to Use These Contexts

1. **Choose a context** suited to your needs
2. **Adapt the structure** to your specific project
3. **Implement the context** in your codebase:
   - Create the file in `src/daydreams/context/`
   - Create actions in `src/daydreams/actions/`
   - Register the context in your system

4. **Create an agent** with the context:

```typescript
const agent = {
  name: 'My Specialized Agent',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['context-name'],
  context_args: {
    // Context-specific arguments
  },
};
```

## Customization

These contexts are base proposals. You can:

- Combine multiple contexts
- Add/remove actions
- Modify memory structure
- Adapt instructions to your tone
- Integrate your specific tools via MCP

## Next Steps

1. Identify your specific needs
2. Select or combine contexts
3. Test with a prototype
4. Iterate based on feedback
5. Deploy to production

For any questions or improvement suggestions, feel free to contribute!

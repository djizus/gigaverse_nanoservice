# Context: Code Review with GitHub

## Description

A context for performing thorough code reviews by connecting to GitHub via MCP. The agent can analyze pull requests, comment on code, and suggest improvements.

## Use Cases

- Pull request reviews
- Code quality analysis
- Potential bug detection
- Optimization suggestions
- Code standards verification
- Change documentation

## Context Structure

### Persistent Memory

```typescript
interface CodeReviewMemory {
  repository: {
    owner: string;
    name: string;
    defaultBranch: string;
    language?: string;
  };

  currentPR: {
    number?: number;
    title?: string;
    author?: string;
    state?: 'open' | 'closed' | 'merged';
    filesChanged?: number;
    additions?: number;
    deletions?: number;
  };

  reviewedFiles: Array<{
    filename: string;
    status: 'reviewed' | 'pending' | 'flagged';
    issues: Array<{
      line: number;
      severity: 'error' | 'warning' | 'info';
      message: string;
    }>;
  }>;

  codePatterns: {
    detected: string[];
    violations: string[];
    suggestions: string[];
  };

  reviewHistory: Array<{
    prNumber: number;
    timestamp: number;
    verdict: 'approved' | 'changes_requested' | 'commented';
    summary: string;
  }>;

  standards: {
    styleguide?: string;
    lintRules?: string[];
    securityChecks?: boolean;
    performanceChecks?: boolean;
  };
}
```

### Main Actions

1. **review.connect** - Connect to GitHub via MCP
2. **review.selectPR** - Select a PR to review
3. **review.analyzeFile** - Analyze a specific file
4. **review.addComment** - Add a comment on a line
5. **review.suggestChange** - Suggest a code change
6. **review.checkPatterns** - Check code patterns
7. **review.securityScan** - Basic security scan
8. **review.performanceCheck** - Check performance issues
9. **review.approve** - Approve the PR
10. **review.requestChanges** - Request changes

## Agent Instructions

```
You are a code review expert with particular attention to:
- Code quality and readability
- Best practices and patterns
- Security and potential vulnerabilities
- Performance and optimization
- Documentation and comments

During a review:
1. Start with an overview of changes
2. Analyze each file systematically
3. Identify critical issues first
4. Suggest concrete improvements with examples
5. Stay constructive and educational

Format your feedback with:
- 🔴 Critical: blocking issues
- 🟡 Important: should ideally be fixed
- 🟢 Suggestion: optional improvements
- 💡 Info: good practices to know
```

## Required Configuration

- Connected GitHub MCP server
- GitHub token with read/write permissions on PRs
- Access to the relevant repository

## Usage Example

```typescript
const codeReviewerAgent = {
  name: 'GitHub Code Reviewer',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['code-review'],
  context_args: {
    sessionId: 'review-session-789',
    repository: 'myorg/myrepo',
    standards: {
      styleguide: 'airbnb',
      securityChecks: true,
      performanceChecks: true,
    },
  },
};
```

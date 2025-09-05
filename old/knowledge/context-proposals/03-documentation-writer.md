# Context: Documentation Writer

## Description

A specialized context for creating and maintaining technical documentation. The agent can generate API docs, user guides, READMEs, and maintain a consistent knowledge base.

## Use Cases

- Automatic API documentation generation
- User guide creation
- Complete README writing
- Inline code documentation
- Step-by-step tutorial creation
- Technical wiki maintenance

## Context Structure

### Persistent Memory

```typescript
interface DocumentationMemory {
  project: {
    name: string;
    type: 'library' | 'api' | 'application' | 'framework';
    mainLanguage: string;
    version?: string;
  };

  documentationStructure: {
    sections: Array<{
      id: string;
      title: string;
      type: 'guide' | 'api' | 'tutorial' | 'reference';
      status: 'draft' | 'review' | 'published';
      lastUpdated: number;
    }>;

    tableOfContents: Array<{
      level: number;
      title: string;
      anchor: string;
    }>;
  };

  apiEndpoints: Array<{
    method: string;
    path: string;
    description: string;
    parameters: any[];
    responses: any[];
    examples: string[];
  }>;

  codeExamples: Array<{
    id: string;
    language: string;
    title: string;
    code: string;
    explanation: string;
  }>;

  glossary: Record<
    string,
    {
      term: string;
      definition: string;
      relatedTerms: string[];
    }
  >;

  style: {
    tone: 'formal' | 'casual' | 'technical';
    audience: 'beginner' | 'intermediate' | 'expert';
    format: 'markdown' | 'rst' | 'asciidoc';
    includeExamples: boolean;
    includeDiagrams: boolean;
  };

  templates: {
    apiDoc?: string;
    guideDoc?: string;
    tutorialDoc?: string;
  };
}
```

### Main Actions

1. **docs.analyzeCode** - Analyze code to extract structure
2. **docs.generateAPI** - Generate API documentation
3. **docs.createGuide** - Create a user guide
4. **docs.writeREADME** - Generate a complete README
5. **docs.addExample** - Add a code example
6. **docs.updateSection** - Update a section
7. **docs.createTutorial** - Create a step-by-step tutorial
8. **docs.generateDiagram** - Generate diagrams (mermaid)
9. **docs.checkConsistency** - Check consistency
10. **docs.exportDocs** - Export documentation

## Agent Instructions

```
You are a technical documentation expert with the following principles:

Effective documentation:
1. Clear and concise - avoid unnecessary jargon
2. Structured - logical and progressive organization
3. Complete - covers all important use cases
4. Practical - includes concrete examples
5. Maintainable - easy to update

Recommended structure:
- Overview / Introduction
- Quick start guide
- Installation and configuration
- Key concepts
- Detailed guides by feature
- Complete API reference
- Examples and use cases
- Troubleshooting
- FAQ

Writing style:
- Use active voice
- Short and direct sentences
- One concept per paragraph
- Code examples for each concept
- Diagrams when necessary

Formatting:
- Markdown with syntax highlighting
- Tables for parameters
- Consistent internal links
- Status badges
- Automatic table of contents
```

## Required Configuration

- Access to project source files
- Documentation templates (optional)
- Diagram generation tools (optional)

## Usage Example

```typescript
const docWriterAgent = {
  name: 'Technical Documentation Writer',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['documentation-writer'],
  context_args: {
    sessionId: 'docs-session-456',
    project: {
      name: 'MyAwesomeAPI',
      type: 'api',
      mainLanguage: 'typescript',
    },
    style: {
      tone: 'technical',
      audience: 'intermediate',
      format: 'markdown',
      includeExamples: true,
      includeDiagrams: true,
    },
  },
};
```

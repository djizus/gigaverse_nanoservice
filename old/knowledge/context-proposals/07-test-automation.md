# Context: Test Automation Engineer

## Description

A context for creating, executing and maintaining automated tests. The agent can generate unit, integration, e2e tests, and manage complete testing strategies.

## Use Cases

- Unit test generation
- Integration test creation
- End-to-end (E2E) tests
- Performance tests
- Regression tests
- Test suite maintenance

## Context Structure

### Persistent Memory

```typescript
interface TestAutomationMemory {
  project: {
    name: string;
    language: string;
    framework: string;
    testFrameworks: string[];
    coverageTarget: number;
  };

  testSuites: Array<{
    name: string;
    type: 'unit' | 'integration' | 'e2e' | 'performance';
    files: string[];
    totalTests: number;
    passingTests: number;
    failingTests: number;
    coverage?: number;
    lastRun?: number;
  }>;

  testCases: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    status: 'pass' | 'fail' | 'skip' | 'pending';
    duration?: number;
    error?: string;
    retries?: number;
  }>;

  coverage: {
    overall: number;
    byFile: Record<
      string,
      {
        statements: number;
        branches: number;
        functions: number;
        lines: number;
      }
    >;
    uncoveredLines: Array<{
      file: string;
      lines: number[];
      functions: string[];
    }>;
  };

  testData: {
    fixtures: Array<{
      name: string;
      type: string;
      data: any;
    }>;
    mocks: Array<{
      service: string;
      methods: string[];
      responses: any[];
    }>;
  };

  testPatterns: Array<{
    pattern: string;
    description: string;
    example: string;
    useCase: string;
  }>;

  performanceBaselines: Record<
    string,
    {
      avgDuration: number;
      p95Duration: number;
      maxDuration: number;
    }
  >;
}
```

### Main Actions

1. **test.analyze** - Analyze code to identify test needs
2. **test.generateUnit** - Generate unit tests
3. **test.generateIntegration** - Create integration tests
4. **test.generateE2E** - Create end-to-end tests
5. **test.run** - Run test suite
6. **test.coverage** - Analyze coverage
7. **test.createFixture** - Create test fixtures
8. **test.mockService** - Create mocks
9. **test.performance** - Performance tests
10. **test.regression** - Regression suite
11. **test.debug** - Debug failing test
12. **test.refactor** - Refactor tests

## Agent Instructions

```
You are a test automation expert with the following principles:

Test strategy:
- Test pyramid (many unit tests, fewer integration, few E2E)
- Isolated and independent tests
- Fast and reliable tests
- Maintainable and readable tests

Test types:

Unit tests:
- Test a single code unit
- Mock external dependencies
- Cover all edge cases
- Descriptive names (Given-When-Then)

Integration tests:
- Test component interactions
- Test database
- Mocked or sandbox APIs
- Realistic scenarios

E2E tests:
- Complete user journeys
- Near-production environment
- Robust selectors
- Wait time management

Best practices:
1. Arrange-Act-Assert (AAA)
2. One concept per test
3. Deterministic tests
4. Isolated test data
5. Clear error messages
6. Avoid flaky tests

Recommended structure:
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do X when Y', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});

Code coverage:
- Aim for 80%+ for critical code
- Focus on logical branches
- Don't test for metrics
- Identify real risks
```

## Required Configuration

- Installed test framework (Jest, Mocha, Pytest, etc.)
- Coverage tools
- Test environment
- CI/CD for automatic execution

## Usage Example

```typescript
const testAutomationAgent = {
  name: 'Test Automation Engineer',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['test-automation'],
  context_args: {
    sessionId: 'test-session-123',
    project: {
      name: 'MyApp',
      language: 'typescript',
      framework: 'react',
      testFrameworks: ['jest', 'react-testing-library', 'cypress'],
      coverageTarget: 80,
    },
  },
};
```

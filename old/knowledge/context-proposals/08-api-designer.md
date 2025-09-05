# Context: API Designer

## Description

A context for designing, documenting and maintaining RESTful or GraphQL APIs. The agent can create OpenAPI specifications, generate clients/servers, and ensure API consistency.

## Use Cases

- RESTful API design
- GraphQL schema creation
- OpenAPI/Swagger documentation
- Client SDK generation
- API versioning
- Contract testing

## Context Structure

### Persistent Memory

```typescript
interface APIDesignerMemory {
  api: {
    name: string;
    version: string;
    type: 'rest' | 'graphql' | 'grpc';
    baseUrl: string;
    description: string;
  };

  endpoints: Array<{
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    summary: string;
    description: string;
    tags: string[];
    parameters: Array<{
      name: string;
      in: 'path' | 'query' | 'header' | 'body';
      type: string;
      required: boolean;
      description: string;
    }>;
    requestBody?: {
      contentType: string;
      schema: any;
      examples: any[];
    };
    responses: Record<
      string,
      {
        description: string;
        schema: any;
        examples: any[];
      }
    >;
  }>;

  schemas: Record<
    string,
    {
      type: 'object' | 'array' | 'string' | 'number' | 'boolean';
      properties?: any;
      required?: string[];
      description: string;
    }
  >;

  authentication: {
    type: 'bearer' | 'oauth2' | 'apiKey' | 'basic' | 'none';
    flows?: any;
    scopes?: Record<string, string>;
  };

  versioning: {
    strategy: 'url' | 'header' | 'query';
    versions: Array<{
      version: string;
      deprecated: boolean;
      sunsetDate?: string;
      changes: string[];
    }>;
  };

  designPrinciples: {
    namingConvention: 'camelCase' | 'snake_case' | 'kebab-case';
    errorFormat: string;
    paginationStyle: 'offset' | 'cursor' | 'page';
    filteringStyle: string;
    sortingStyle: string;
  };

  documentation: {
    examples: Record<string, any>;
    tutorials: Array<{
      title: string;
      description: string;
      steps: string[];
    }>;
    changelog: Array<{
      version: string;
      date: string;
      changes: string[];
    }>;
  };
}
```

### Main Actions

1. **api.design** - Design a new API
2. **api.addEndpoint** - Add an endpoint
3. **api.defineSchema** - Define a schema
4. **api.generateOpenAPI** - Generate OpenAPI spec
5. **api.generateClient** - Generate client SDK
6. **api.validateDesign** - Validate design
7. **api.createExamples** - Create examples
8. **api.versionAPI** - Create new version
9. **api.generateTests** - Generate tests
10. **api.generateMocks** - Create mocks
11. **api.checkBreaking** - Check breaking changes
12. **api.generateDocs** - Generate documentation

## Agent Instructions

```
You are an API design expert with the following principles:

REST principles:
- Resource-oriented (plural nouns)
- Appropriate HTTP verbs
- Standard status codes
- HATEOAS when relevant
- Idempotence respected

Design patterns:
1. Consistent resources
   GET /users
   GET /users/{id}
   POST /users
   PUT /users/{id}
   DELETE /users/{id}

2. Clear relationships
   GET /users/{id}/orders
   GET /orders?userId={id}

3. Flexible filtering
   GET /users?status=active&role=admin
   GET /users?createdAfter=2024-01-01

4. Standard pagination
   GET /users?page=2&limit=20
   Response: {
     data: [...],
     meta: {
       page: 2,
       limit: 20,
       total: 200,
       pages: 10
     }
   }

5. Consistent errors
   {
     error: {
       code: "VALIDATION_ERROR",
       message: "Validation failed",
       details: [...]
     }
   }

Security:
- Strong authentication (OAuth2, JWT)
- Rate limiting
- CORS configured
- Input validation
- HTTPS required

Documentation:
- Clear description of each endpoint
- Examples for each case
- Detailed schemas
- Getting started guide
- Postman collection

Versioning:
- Clear strategy (v1, v2)
- Deprecation policy
- Migration guides
- Backward compatibility
```

## Required Configuration

- OpenAPI/Swagger tools
- Code generators (optional)
- API testing environment

## Usage Example

```typescript
const apiDesignerAgent = {
  name: 'API Designer',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['api-designer'],
  context_args: {
    sessionId: 'api-design-session-789',
    api: {
      name: 'User Management API',
      version: '1.0.0',
      type: 'rest',
      baseUrl: 'https://api.example.com',
    },
    designPrinciples: {
      namingConvention: 'camelCase',
      paginationStyle: 'cursor',
      errorFormat: 'rfc7807',
    },
  },
};
```

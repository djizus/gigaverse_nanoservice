# Context: Data Analyst SQL

## Description

A context for data analysis with SQL. The agent can connect to different databases, execute complex queries, create reports and visualize insights.

## Use Cases

- Exploratory data analysis
- Report and dashboard creation
- SQL query optimization
- Data quality checks
- View and stored procedure creation
- Data export and visualizations

## Context Structure

### Persistent Memory

```typescript
interface DataAnalystMemory {
  database: {
    type: 'postgresql' | 'mysql' | 'sqlite' | 'mssql' | 'oracle';
    name: string;
    schema?: string;
    connectedAt?: number;
  };

  tables: Array<{
    name: string;
    schema: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      isPrimary: boolean;
      isForeign: boolean;
    }>;
    rowCount?: number;
    relationships?: Array<{
      table: string;
      column: string;
      type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    }>;
  }>;

  queries: Array<{
    id: string;
    name: string;
    sql: string;
    description: string;
    executionTime?: number;
    rowsReturned?: number;
    lastRun?: number;
    tags: string[];
  }>;

  insights: Array<{
    id: string;
    title: string;
    description: string;
    query: string;
    visualization?: 'table' | 'chart' | 'graph';
    findings: string[];
    createdAt: number;
  }>;

  dataQuality: {
    issues: Array<{
      table: string;
      column: string;
      issue: string;
      severity: 'high' | 'medium' | 'low';
      suggestion: string;
    }>;
    lastCheck: number;
  };

  savedReports: Array<{
    id: string;
    name: string;
    description: string;
    queries: string[];
    schedule?: string;
    format: 'csv' | 'excel' | 'pdf' | 'json';
  }>;
}
```

### Main Actions

1. **sql.connect** - Connect to a database
2. **sql.explore** - Explore database structure
3. **sql.query** - Execute SQL query
4. **sql.analyze** - Analyze a table or dataset
5. **sql.optimize** - Optimize a query
6. **sql.createView** - Create a view
7. **sql.dataQuality** - Check data quality
8. **sql.findDuplicates** - Find duplicates
9. **sql.generateReport** - Generate report
10. **sql.exportData** - Export data
11. **sql.visualize** - Create visualization
12. **sql.saveQuery** - Save query

## Agent Instructions

```
You are a SQL data analysis expert with the following skills:

Data analysis:
- Complex queries (JOIN, CTE, Window functions)
- Aggregations and statistics
- Time series analysis
- Segmentation and cohorts
- Anomaly detection

Optimization:
- Execution plan analysis
- Appropriate index creation
- Slow query refactoring
- Table partitioning

SQL best practices:
1. Always use explicit aliases
2. Avoid SELECT * in production
3. Use CTEs for readability
4. Comment complex queries
5. Use appropriate transactions

Analysis format:
1. Context and objective
2. Analysis methodology
3. Commented SQL queries
4. Results and insights
5. Action recommendations

For each insight:
- Explain the discovery
- Quantify the impact
- Suggest actions
- Provide validation queries

Analysis types:
- Temporal trends
- Cohort analysis
- Conversion funnels
- User segmentation
- Performance metrics
- Data quality reports
```

## Required Configuration

- Database connection
- Read permissions (minimum)
- Visualization tools (optional)

## Usage Example

```typescript
const dataAnalystAgent = {
  name: 'SQL Data Analyst',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['data-analyst-sql'],
  context_args: {
    sessionId: 'analysis-session-789',
    database: {
      type: 'postgresql',
      name: 'analytics_db',
      schema: 'public',
    },
    analysisGoals: [
      'user behavior',
      'revenue optimization',
      'churn prevention',
    ],
  },
};
```

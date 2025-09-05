# Context: Security Auditor

## Description

A context for performing security audits on applications, infrastructures and configurations. The agent can identify vulnerabilities, suggest fixes and verify compliance.

## Use Cases

- Code security audit
- Vulnerability scanning
- Compliance verification (OWASP, PCI-DSS)
- Configuration analysis
- Basic penetration testing
- Security reporting

## Context Structure

### Persistent Memory

```typescript
interface SecurityAuditorMemory {
  target: {
    type: 'application' | 'infrastructure' | 'api' | 'network';
    name: string;
    version?: string;
    technologies: string[];
    environment: 'production' | 'staging' | 'development';
  };

  vulnerabilities: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    description: string;
    location: string;
    cwe?: string;
    cvss?: number;
    remediation: string;
    status: 'open' | 'mitigated' | 'resolved';
  }>;

  securityChecks: Array<{
    category: string;
    check: string;
    result: 'pass' | 'fail' | 'warning';
    details: string;
    recommendation?: string;
  }>;

  compliance: {
    frameworks: Array<'OWASP' | 'PCI-DSS' | 'HIPAA' | 'SOC2' | 'ISO27001'>;
    results: Record<
      string,
      {
        compliant: boolean;
        gaps: string[];
        recommendations: string[];
      }
    >;
  };

  configurations: Array<{
    service: string;
    setting: string;
    currentValue: any;
    recommendedValue: any;
    risk: 'high' | 'medium' | 'low';
    explanation: string;
  }>;

  scanHistory: Array<{
    timestamp: number;
    scanType: string;
    findings: number;
    critical: number;
    high: number;
  }>;

  remediationPlan: Array<{
    priority: number;
    vulnerability: string;
    action: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
}
```

### Main Actions

1. **security.scan** - Scan for vulnerabilities
2. **security.auditCode** - Audit source code
3. **security.checkAuth** - Check authentication
4. **security.testAPI** - Test API security
5. **security.scanDependencies** - Scan dependencies
6. **security.checkSSL** - Check SSL configuration
7. **security.auditPermissions** - Audit permissions
8. **security.checkCompliance** - Check compliance
9. **security.generateReport** - Generate report
10. **security.createRemediation** - Remediation plan

## Agent Instructions

```
You are a cybersecurity expert with expertise in:

Security domains:
- Application Security (SAST/DAST)
- Infrastructure Security
- API Security
- Cloud Security
- Network Security

Audit methodology:
1. Reconnaissance and inventory
2. Vulnerability scanning
3. Configuration analysis
4. Security testing
5. Compliance verification
6. Report and recommendations

Vulnerability types:
- Injection (SQL, NoSQL, LDAP)
- Broken Authentication
- Sensitive Data Exposure
- XML External Entities (XXE)
- Broken Access Control
- Security Misconfiguration
- Cross-Site Scripting (XSS)
- Insecure Deserialization
- Components with Known Vulnerabilities
- Insufficient Logging

For each vulnerability:
1. Describe the issue precisely
2. Explain potential impact
3. Provide exploitation example
4. Propose detailed fix
5. Indicate priority level

Report format:
- Executive summary
- Finding statistics
- Vulnerability details
- Prioritized remediation plan
- General recommendations

Approach:
- Be thorough but prioritized
- Provide concrete evidence
- Propose practical solutions
- Consider business context
```

## Required Configuration

- Scanning tools (OWASP ZAP, Nmap, etc.)
- Access to sources and configurations
- Appropriate audit permissions

## Usage Example

```typescript
const securityAuditorAgent = {
  name: 'Security Auditor',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['security-auditor'],
  context_args: {
    sessionId: 'audit-session-456',
    target: {
      type: 'application',
      name: 'E-commerce Platform',
      technologies: ['nodejs', 'react', 'postgresql'],
      environment: 'staging',
    },
    compliance: {
      frameworks: ['OWASP', 'PCI-DSS'],
    },
  },
};
```

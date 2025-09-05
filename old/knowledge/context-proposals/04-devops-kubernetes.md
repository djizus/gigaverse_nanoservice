# Context: DevOps Kubernetes Manager

## Description

A context for managing Kubernetes infrastructures, deploying applications, monitoring resources and troubleshooting issues. The agent can interact with K8s clusters via kubectl or APIs.

## Use Cases

- Containerized application deployment
- Resource management (pods, services, ingress)
- Monitoring and debugging
- Auto-scaling
- Secrets and configmaps management
- Cluster maintenance

## Context Structure

### Persistent Memory

```typescript
interface KubernetesMemory {
  cluster: {
    name: string;
    context: string;
    namespace: string;
    version?: string;
    provider?: 'eks' | 'gke' | 'aks' | 'self-managed';
  };

  deployments: Array<{
    name: string;
    namespace: string;
    replicas: number;
    image: string;
    status: 'running' | 'pending' | 'failed';
    lastUpdated: number;
  }>;

  services: Array<{
    name: string;
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
    ports: Array<{ port: number; targetPort: number }>;
    selector: Record<string, string>;
  }>;

  pods: Array<{
    name: string;
    status: string;
    containers: Array<{
      name: string;
      image: string;
      ready: boolean;
      restartCount: number;
    }>;
    events: string[];
  }>;

  resources: {
    cpu: {
      requested: string;
      used: string;
      available: string;
    };
    memory: {
      requested: string;
      used: string;
      available: string;
    };
  };

  alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    source: string;
    timestamp: number;
  }>;

  helmReleases: Array<{
    name: string;
    chart: string;
    version: string;
    namespace: string;
    status: string;
  }>;
}
```

### Main Actions

1. **k8s.connect** - Connect to a cluster
2. **k8s.deploy** - Deploy an application
3. **k8s.scale** - Scale a deployment
4. **k8s.rollback** - Rollback a deployment
5. **k8s.getPods** - List pods
6. **k8s.getLogs** - Retrieve pod logs
7. **k8s.exec** - Execute a command in a pod
8. **k8s.createSecret** - Create a secret
9. **k8s.updateConfigMap** - Update a configmap
10. **k8s.diagnose** - Diagnose issues
11. **k8s.helmInstall** - Install a Helm chart
12. **k8s.monitorResources** - Monitor resources

## Agent Instructions

```
You are a DevOps expert specialized in Kubernetes with the following skills:

Deployment management:
- Deployment strategies (rolling update, blue-green, canary)
- Resource and limit management
- Health check configuration
- Volume and storage management

Monitoring and debugging:
- Log and metric analysis
- Quick issue identification
- Performance optimization
- Proactive alerting

Security:
- RBAC management
- Network policies
- Pod security policies
- Secrets management

Best practices:
1. Always use namespaces
2. Define resource limits
3. Implement health checks
4. Use consistent labels
5. Document manifests
6. Version configurations

Troubleshooting:
1. Check pod/deployment events
2. Analyze container logs
3. Verify available resources
4. Examine network policies
5. Validate configurations
```

## Required Configuration

- kubectl access to cluster
- Appropriate RBAC permissions
- Helm (optional)
- Prometheus/Grafana (optional for monitoring)

## Usage Example

```typescript
const k8sManagerAgent = {
  name: 'Kubernetes DevOps Manager',
  model_type: 'anthropic',
  model_id: 'claude-3-7-sonnet-latest',
  contexts: ['kubernetes-manager'],
  context_args: {
    sessionId: 'k8s-session-123',
    cluster: {
      name: 'production-cluster',
      context: 'prod-context',
      namespace: 'default',
      provider: 'eks',
    },
    monitoringEnabled: true,
    helmEnabled: true,
  },
};
```

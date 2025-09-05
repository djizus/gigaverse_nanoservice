import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMcpStore } from '@/stores/mcp.store';
import { McpServerTemplate } from '@/types/mcp';

export function McpPage() {
  const {
    templates,
    connectedServers,
    selectedServers,
    isLoading,
    error,
    loadTemplates,
    loadConnectedServers,
    connectServer,
    disconnectServer,
    toggleServerSelection,
    getSelectedMcpConfig,
  } = useMcpStore();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadConnectedServers();

    // Refresh connected servers every 30 seconds
    const interval = setInterval(loadConnectedServers, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryColor = (category: string) => {
    const colors = {
      productivity: 'bg-blue-100 text-blue-800',
      data: 'bg-green-100 text-green-800',
      communication: 'bg-purple-100 text-purple-800',
      development: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      connected: 'text-green-600',
      connecting: 'text-yellow-600',
      disconnected: 'text-gray-600',
      error: 'text-red-600',
    };
    return colors[status as keyof typeof colors] || colors.disconnected;
  };

  const isServerConnected = (templateId: string) => {
    return connectedServers.some(
      (server) =>
        server.id.includes(templateId) && server.status === 'connected',
    );
  };

  const handleConnectServer = async (template: McpServerTemplate) => {
    try {
      await connectServer(template.id);
    } catch (error) {
      console.error('Failed to connect server:', error);
    }
  };

  const handleDisconnectServer = async (serverId: string) => {
    try {
      await disconnectServer(serverId);
    } catch (error) {
      console.error('Failed to disconnect server:', error);
    }
  };

  const exportConfig = () => {
    const config = getSelectedMcpConfig();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mcp-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Chargement des serveurs MCP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Serveurs MCP</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos connexions Model Context Protocol
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportConfig}>
            Exporter la configuration
          </Button>
          <Badge variant="secondary">
            {selectedServers.length} sélectionné
            {selectedServers.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-800">❌ {error}</div>
          </CardContent>
        </Card>
      )}

      {/* Connected Servers Section */}
      {connectedServers.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Serveurs connectés</h2>
          <div className="grid gap-4">
            {connectedServers.map((server) => (
              <Card key={server.id} className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{server.id}</div>
                        <div className="text-sm text-gray-600">
                          Status:{' '}
                          <span className={getStatusColor(server.status)}>
                            {server.status}
                          </span>
                          {server.lastConnected && (
                            <span className="ml-2">
                              - Connecté le{' '}
                              {new Date(server.lastConnected).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {server.capabilities && (
                          <div className="flex gap-2 mt-1">
                            {server.capabilities.tools && (
                              <Badge variant="outline">Outils</Badge>
                            )}
                            {server.capabilities.resources && (
                              <Badge variant="outline">Ressources</Badge>
                            )}
                            {server.capabilities.prompts && (
                              <Badge variant="outline">Prompts</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectServer(server.id)}
                    >
                      Déconnecter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Serveurs disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const connected = isServerConnected(template.id);
            const selected = selectedServers.some(
              (s) => s.template.id === template.id,
            );

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selected ? 'border-blue-500 bg-blue-50' : ''
                } ${connected ? 'border-green-500' : ''}`}
                onClick={() =>
                  setSelectedTemplate(
                    selectedTemplate === template.id ? null : template.id,
                  )
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div>
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription>
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      {connected && (
                        <Badge variant="outline" className="text-green-600">
                          Connecté
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {template.requiredEnvVars &&
                      template.requiredEnvVars.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div className="text-sm font-medium text-yellow-800">
                            Variables requises:
                          </div>
                          <div className="text-sm text-yellow-700">
                            {template.requiredEnvVars.join(', ')}
                          </div>
                        </div>
                      )}

                    {template.setupInstructions && (
                      <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                        {template.setupInstructions}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!connected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleConnectServer(template);
                          }}
                        >
                          Se connecter
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            const connectedServer = connectedServers.find(
                              (s) =>
                                s.id.includes(template.id) &&
                                s.status === 'connected',
                            );
                            if (connectedServer) {
                              handleDisconnectServer(connectedServer.id);
                            }
                          }}
                        >
                          Déconnecter
                        </Button>
                      )}

                      <Button
                        variant={selected ? 'default' : 'ghost'}
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          toggleServerSelection(template);
                        }}
                      >
                        {selected ? 'Désélectionner' : 'Sélectionner'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Selected Configuration Summary */}
      {selectedServers.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Configuration sélectionnée
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <div className="font-medium">Serveurs sélectionnés:</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedServers.map((selection) => (
                      <Badge key={selection.template.id} variant="outline">
                        {selection.template.icon} {selection.template.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium mb-2">
                    Configuration JSON:
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                    {JSON.stringify(getSelectedMcpConfig(), null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

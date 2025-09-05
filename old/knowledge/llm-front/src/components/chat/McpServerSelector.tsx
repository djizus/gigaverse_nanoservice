import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  CheckCircle,
  Server,
  Settings,
  Plug,
  Unplug,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMcpStore } from '@/stores/mcp.store';
import { McpServerTemplate } from '@/types/mcp';

interface McpServerSelectorProps {
  onSelectionChange?: (selectedServers: any[]) => void;
  showConnectedServers?: boolean;
}

export function McpServerSelector({
  onSelectionChange,
  showConnectedServers = true,
}: McpServerSelectorProps) {
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
    updateServerConfig,
    clearSelections,
  } = useMcpStore();

  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    if (showConnectedServers) {
      loadConnectedServers();
    }
  }, [showConnectedServers]);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedServers);
    }
  }, [selectedServers, onSelectionChange]);

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

  const getConnectedServerId = (templateId: string) => {
    const server = connectedServers.find(
      (server) =>
        server.id.includes(templateId) && server.status === 'connected',
    );
    return server?.id;
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

  const handleConfigUpdate = (
    templateId: string,
    field: string,
    value: any,
  ) => {
    updateServerConfig(templateId, { [field]: value });
  };

  const isSelected = (templateId: string) => {
    return selectedServers.some((s) => s.template.id === templateId);
  };

  const getSelectedConfig = (templateId: string) => {
    return (
      selectedServers.find((s) => s.template.id === templateId)?.config || {}
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-center">
          <Server className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Chargement des serveurs MCP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connected Servers Section */}
      {showConnectedServers && connectedServers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Serveurs connectés</h3>
          <div className="grid gap-3">
            {connectedServers.map((server) => (
              <Card key={server.id} className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
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
                      <Unplug className="h-4 w-4 mr-1" />
                      Déconnecter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator className="my-6" />
        </div>
      )}

      {/* Template Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Serveurs MCP disponibles</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelections}>
              Tout désélectionner
            </Button>
            <Badge variant="secondary">
              {selectedServers.length} sélectionné
              {selectedServers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="grid gap-4">
            {templates.map((template) => {
              const connected = isServerConnected(template.id);
              const connectedServerId = getConnectedServerId(template.id);
              const selected = isSelected(template.id);
              const config = getSelectedConfig(template.id);

              return (
                <Card
                  key={template.id}
                  className={`${selected ? 'border-blue-500 bg-blue-50' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() =>
                            toggleServerSelection(template)
                          }
                        />
                        <div className="text-2xl">{template.icon}</div>
                        <div>
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                          <CardDescription>
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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

                  {selected && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Basic Configuration */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`name-${template.id}`}>
                              Nom du serveur
                            </Label>
                            <Input
                              id={`name-${template.id}`}
                              value={config.name || template.name}
                              onChange={(e) =>
                                handleConfigUpdate(
                                  template.id,
                                  'name',
                                  e.target.value,
                                )
                              }
                              placeholder={template.name}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`timeout-${template.id}`}>
                              Timeout (ms)
                            </Label>
                            <Input
                              id={`timeout-${template.id}`}
                              type="number"
                              value={config.timeout || 30000}
                              onChange={(e) =>
                                handleConfigUpdate(
                                  template.id,
                                  'timeout',
                                  parseInt(e.target.value),
                                )
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`description-${template.id}`}>
                            Description
                          </Label>
                          <Textarea
                            id={`description-${template.id}`}
                            value={config.description || template.description}
                            onChange={(e) =>
                              handleConfigUpdate(
                                template.id,
                                'description',
                                e.target.value,
                              )
                            }
                            className="min-h-[60px]"
                          />
                        </div>

                        {/* Required Environment Variables */}
                        {template.requiredEnvVars &&
                          template.requiredEnvVars.length > 0 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>
                                  Variables d'environnement requises:
                                </strong>{' '}
                                {template.requiredEnvVars.join(', ')}
                                {template.setupInstructions && (
                                  <div className="mt-2 text-sm">
                                    {template.setupInstructions}
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}

                        {/* Quick Connect/Disconnect */}
                        <div className="flex gap-2">
                          {!connected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnectServer(template)}
                            >
                              <Plug className="h-4 w-4 mr-1" />
                              Tester la connexion
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                connectedServerId &&
                                handleDisconnectServer(connectedServerId)
                              }
                            >
                              <Unplug className="h-4 w-4 mr-1" />
                              Déconnecter
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedTemplate(
                                expandedTemplate === template.id
                                  ? null
                                  : template.id,
                              )
                            }
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            {expandedTemplate === template.id
                              ? 'Masquer'
                              : 'Configurer'}
                          </Button>
                        </div>

                        {/* Advanced Configuration */}
                        {expandedTemplate === template.id && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`retry-${template.id}`}>
                                  Tentatives de reconnexion
                                </Label>
                                <Input
                                  id={`retry-${template.id}`}
                                  type="number"
                                  value={config.retryCount || 3}
                                  onChange={(e) =>
                                    handleConfigUpdate(
                                      template.id,
                                      'retryCount',
                                      parseInt(e.target.value),
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor={`delay-${template.id}`}>
                                  Délai entre tentatives (ms)
                                </Label>
                                <Input
                                  id={`delay-${template.id}`}
                                  type="number"
                                  value={config.retryDelay || 5000}
                                  onChange={(e) =>
                                    handleConfigUpdate(
                                      template.id,
                                      'retryDelay',
                                      parseInt(e.target.value),
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`enabled-${template.id}`}
                                checked={config.enabled !== false}
                                onCheckedChange={(checked) =>
                                  handleConfigUpdate(
                                    template.id,
                                    'enabled',
                                    checked,
                                  )
                                }
                              />
                              <Label htmlFor={`enabled-${template.id}`}>
                                Activer ce serveur
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

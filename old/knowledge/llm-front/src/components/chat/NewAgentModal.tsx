import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Server } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { McpServerSelector } from './McpServerSelector';
import { useMcpStore } from '@/stores/mcp.store';
import { httpService } from '@/services/http.service';

interface Template {
  id: string;
  name: string;
  description: string;
  
  // Model configuration
  model_type?: 'anthropic' | 'openai' | null;
  model_id?: string | null;
  
  // Context configuration
  contexts?: string[];
  context_args?: Record<string, any>;
  
  // Capabilities
  // capabilities?: string[];
  
  // Instructions and content
  instructions?: string;
  content?: string; // Legacy field
  
  // Variables
  variables?: Array<{
    name: string;
    description?: string;
    type?: 'text' | 'number' | 'boolean' | 'select';
    defaultValue?: any;
    required?: boolean;
    options?: string[];
  }>;
  
  // MCP configuration
  mcpServers?: string[];
  
  // Legacy fields for backward compatibility
  context?: {
    type: string;
    schema?: any;
    defaultArgs?: any;
  };
  defaultArgs?: Record<string, Record<string, unknown>>;
}

interface NewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent: (agentConfig: {
    name: string;
    modelType: string;
    modelId: string;
    instructions: string;
    contexts: string[];
    contextArgs: Record<string, Record<string, unknown>>;
    mcpConfig?: any;
  }) => void;
}

export function NewAgentModal({
  isOpen,
  onClose,
  onCreateAgent,
}: NewAgentModalProps) {
  const {
    getSelectedMcpConfig,
    selectedServers,
    loadTemplates: loadMcpTemplates,
  } = useMcpStore();
  const [modelType, setModelType] = useState<'anthropic' | 'openai'>(
    'anthropic',
  );
  const [modelId, setModelId] = useState<string>('claude-3-5-sonnet-latest');
  const [agentName, setAgentName] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [creationMethod, setCreationMethod] = useState<'template' | 'context'>(
    'template',
  );
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);

  // List of available contexts
  const availableContexts = [
    'general',
    'coding',
    'writing',
    'analysis',
    'creative',
    'chat',
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'no-template') {
      fetchTemplateDetails(selectedTemplate);
    } else {
      setEditingTemplate(null);
    }
  }, [selectedTemplate]);

  // Pre-fill fields when template is loaded
  useEffect(() => {
    if (editingTemplate && creationMethod === 'template') {
      console.log('🔄 [NewAgentModal] Pre-filling from template:', {
        model_type: editingTemplate.model_type,
        model_id: editingTemplate.model_id,
        contexts: editingTemplate.contexts,
        // capabilities: editingTemplate.capabilities,
        instructions: editingTemplate.instructions?.substring(0, 100),
      });
      // Pre-fill model configuration from template
      if (editingTemplate.model_type) {
        setModelType(editingTemplate.model_type);
      }
      if (editingTemplate.model_id) {
        setModelId(editingTemplate.model_id);
      }
      // Don't need to set context as template handles it
      // Template capabilities will be used directly
    }
  }, [editingTemplate, creationMethod]);

  const fetchTemplates = async () => {
    try {
      const data = await httpService.get<{ templates: Template[] }>(
        '/daydreams/templates',
      );
      console.log('📚 [NewAgentModal] Templates loaded:', data.templates);
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setError('Failed to load templates');
    }
  };

  const fetchTemplateDetails = async (templateId: string) => {
    try {
      console.log('🔍 [NewAgentModal] Fetching template details for ID:', templateId);
      const data = await httpService.get<{ template: Template }>(
        `/daydreams/templates/${templateId}`,
      );
      console.log('📥 [NewAgentModal] Raw template response:', data);
      console.log('🎯 [NewAgentModal] Template details loaded:', data.template);
      
      if (data.template) {
        setEditingTemplate(data.template);
      } else if ((data as any).success && (data as any).template) {
        setEditingTemplate((data as any).template);
      } else {
        console.error('❌ No template found in response');
        setError('Template not found');
      }
    } catch (error) {
      console.error('Error loading template details:', error);
      setError('Failed to load template details');
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      // Ensure context is properly set
      const templateToSave = {
        ...editingTemplate,
        context: {
          type: editingTemplate.context?.type || 'chat',
        },
      };

      await httpService.put(
        `/daydreams/templates/${editingTemplate.id}`,
        templateToSave,
      );

      await fetchTemplates();
      setError(null);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleCreateAgent = async () => {
    console.log('🚀 [NewAgentModal] Starting agent creation:', {
      agentName,
      selectedTemplate,
      selectedContext,
      modelType,
      modelId,
      hasEditingTemplate: !!editingTemplate,
    });

    if (creationMethod === 'template' && !selectedTemplate) {
      setError('Please select a template');
      return;
    }
    if (creationMethod === 'context' && !selectedContext) {
      setError('Please select a context type');
      return;
    }
    if (!agentName.trim()) {
      setError('Please provide a name for the agent');
      return;
    }

    setIsCreatingAgent(true);
    setError(null);

    try {
      // Get MCP configuration if servers are selected
      const mcpConfig =
        selectedServers.length > 0 ? getSelectedMcpConfig() : undefined;

      // Create agent from template if selected
      if (
        creationMethod === 'template' &&
        selectedTemplate &&
        editingTemplate
      ) {
        // Use the complete template configuration
        const templateContexts = editingTemplate.contexts || 
                                (editingTemplate.context?.type ? [editingTemplate.context.type] : ['chat']);
        const templateModelType = editingTemplate.model_type || modelType || 'anthropic';
        const templateModelId = editingTemplate.model_id || modelId || 'claude-3-5-sonnet-latest';
        // const templateCapabilities = editingTemplate.capabilities || ['chat', 'memory'];
        const templateInstructions = editingTemplate.instructions || editingTemplate.content || 
                                    `You are ${agentName.trim()}, an AI assistant.`;

        console.log('📋 [NewAgentModal] Creating agent from template:', {
          templateId: editingTemplate.id,
          templateName: editingTemplate.name,
          contexts: templateContexts,
          // capabilities: templateCapabilities,
          modelType: templateModelType,
          modelId: templateModelId,
          mcpEnabled: !!mcpConfig,
        });

        const agentConfig = {
          templateId: editingTemplate.id,
          name: agentName.trim(),
          modelType: templateModelType,
          modelId: templateModelId,
          instructions: templateInstructions,
          instructionsMode: 'replace' as const,
          contexts: templateContexts,
          // capabilities: templateCapabilities,
          contextArgs: editingTemplate.context_args || {
            ...templateContexts.reduce((acc, ctx) => ({
              ...acc,
              [ctx]: {
                sessionId: `session-${Date.now()}`,
                userId: 'user',
                ...(editingTemplate.context_args?.[ctx] || {}),
              }
            }), {}),
            template: {
              content: templateInstructions,
              variables: editingTemplate.variables || [],
              // capabilities: templateCapabilities,
              defaultArgs: editingTemplate.defaultArgs || {},
              name: editingTemplate.name,
              description: editingTemplate.description,
              id: editingTemplate.id,
            },
          },
          ...(mcpConfig && { mcpConfig }),
        };

        console.log(
          '📤 [NewAgentModal] Passing agent config to onCreateAgent:',
          {
            ...agentConfig,
            instructions: agentConfig.instructions?.substring(0, 100) + '...',
            instructionsLength: agentConfig.instructions?.length || 0,
          },
        );

        console.log(
          '📤 [NewAgentModal] Full agent config being sent:',
          JSON.stringify(agentConfig, null, 2),
        );
        
        console.log('🔍 [NewAgentModal] Config analysis:', {
          hasTemplateId: !!agentConfig.templateId,
          templateId: agentConfig.templateId,
          contextsCount: agentConfig.contexts?.length,
          contexts: agentConfig.contexts,
          // capabilities: agentConfig.capabilities,
          instructionsLength: agentConfig.instructions?.length,
        });
        
        // Call onCreateAgent which will handle the API call
        await onCreateAgent(agentConfig);
        onClose();
      }
      // Create agent with context if no template selected
      else if (creationMethod === 'context' && selectedContext) {
        console.log(
          '🎯 [NewAgentModal] Creating agent with direct context:',
          selectedContext,
          {
            mcpEnabled: !!mcpConfig,
          },
        );

        const agentConfig: any = {
          name: agentName.trim(),
          modelType: modelType || 'anthropic',
          modelId: modelId || 'claude-3-5-sonnet-latest',
          instructions: `You are ${agentName.trim()}, an AI assistant specialized in ${selectedContext}.`,
          contexts: [selectedContext],
          contextArgs: {
            [selectedContext]: {
              sessionId: `session-${Date.now()}`,
              userId: 'user',
            },
          },
          ...(mcpConfig && { mcpConfig }),
        };
        // IMPORTANT: Do not include templateId when creating agent with direct context

        console.log(
          '📤 [NewAgentModal] Passing direct agent config to onCreateAgent:',
          agentConfig,
        );

        // Call onCreateAgent which will handle the API call
        await onCreateAgent(agentConfig);
        onClose();
      }
    } catch (err) {
      console.error('💥 [NewAgentModal] Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Choose a model and either select a template or configure a context
            directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid grid-cols-[300px,1fr] gap-6 h-full">
            <div className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="Enter a unique name for your agent"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={modelType}
                  onValueChange={(value: 'anthropic' | 'openai') => {
                    setModelType(value);
                    // Update modelId based on selection
                    setModelId(
                      value === 'anthropic'
                        ? 'claude-3-5-sonnet-latest'
                        : 'gpt-4',
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a model">
                      {modelType === 'anthropic'
                        ? 'Claude 3.5 Sonnet (Anthropic)'
                        : 'GPT-4 (OpenAI)'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">
                      Claude 3.5 Sonnet (Anthropic)
                    </SelectItem>
                    <SelectItem value="openai">GPT-4 (OpenAI)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Model ID: {modelId}
                </p>
              </div>

              {/* MCP Configuration Button */}
              <div className="space-y-2">
                <Label>MCP Servers (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    loadMcpTemplates();
                    setIsMcpModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span>
                      {selectedServers.length > 0
                        ? `${selectedServers.length} server${selectedServers.length > 1 ? 's' : ''} selected`
                        : 'No server selected'}
                    </span>
                  </div>
                  {selectedServers.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedServers.length}
                    </Badge>
                  )}
                </Button>
                {selectedServers.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Servers:{' '}
                    {selectedServers.map((s) => s.template.name).join(', ')}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Creation Method</Label>
                <RadioGroup
                  value={creationMethod}
                  onValueChange={(value: 'template' | 'context') => {
                    setCreationMethod(value);
                    if (value === 'template') {
                      setSelectedContext('');
                    } else {
                      setSelectedTemplate('');
                    }
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="template" id="template" />
                    <Label htmlFor="template">
                      Use a template (recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="context" id="context" />
                    <Label htmlFor="context">Use a basic context</Label>
                  </div>
                </RadioGroup>
              </div>

              {creationMethod === 'template' && (
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select
                    value={selectedTemplate || ''}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template">
                        {templates.find((t) => t.id === selectedTemplate)
                          ?.name || 'Choose a template'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length > 0 ? (
                        templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              {template.description && (
                                <div className="text-sm text-muted-foreground">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">
                          No templates available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {creationMethod === 'context' && (
                <div className="space-y-2">
                  <Label>Select Context Type</Label>
                  <Select
                    value={selectedContext}
                    onValueChange={setSelectedContext}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a context type">
                        {selectedContext || 'Choose a context type'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableContexts.map((context) => (
                        <SelectItem key={context} value={context}>
                          <div>
                            <div className="font-medium capitalize">
                              {context}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {context === 'chat' && 'Basic conversational AI'}
                              {context === 'notion' &&
                                'Notion integration context'}
                              {context === 'discord' && 'Discord bot context'}
                              {context === 'tech-support' &&
                                'Technical support assistant'}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {creationMethod === 'template' &&
              selectedTemplate &&
              editingTemplate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        value={editingTemplate.name}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={editingTemplate.description}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Display template configuration */}
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-semibold mb-2">Template Configuration</h4>
                    <div className="space-y-2 text-sm">
                      {editingTemplate.model_type && (
                        <div>
                          <span className="font-medium">Model:</span>{' '}
                          {editingTemplate.model_type} - {editingTemplate.model_id}
                        </div>
                      )}
                      {editingTemplate.contexts && editingTemplate.contexts.length > 0 && (
                        <div>
                          <span className="font-medium">Contexts:</span>{' '}
                          {editingTemplate.contexts.map((c, i) => (
                            <Badge key={i} variant="secondary" className="ml-1">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {/* {editingTemplate.capabilities && editingTemplate.capabilities.length > 0 && (
                        <div>
                          <span className="font-medium">Capabilities:</span>{' '}
                          {editingTemplate.capabilities.map((c, i) => (
                            <Badge key={i} variant="outline" className="ml-1">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )} */}
                      {editingTemplate.variables && editingTemplate.variables.length > 0 && (
                        <div>
                          <span className="font-medium">Variables:</span>{' '}
                          {editingTemplate.variables.map((v, i) => (
                            <Badge key={i} variant="default" className="ml-1">
                              {v.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                      setActiveTab(value as 'edit' | 'preview')
                    }
                    className="flex-1"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="flex-1 min-h-[500px]">
                      <Textarea
                        value={editingTemplate.content}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            content: e.target.value,
                          })
                        }
                        className="w-full h-full min-h-[500px] font-mono resize-none"
                      />
                    </TabsContent>
                    <TabsContent
                      value="preview"
                      className="flex-1 min-h-[500px]"
                    >
                      <div className="h-full prose prose-sm dark:prose-invert max-w-none border rounded-md p-4 min-h-[500px] bg-muted overflow-y-auto">
                        <ReactMarkdown>
                          {editingTemplate.content || ''}
                        </ReactMarkdown>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button
                    onClick={handleSaveTemplate}
                    variant="secondary"
                    className="w-full"
                  >
                    Save Template
                  </Button>
                </div>
              )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAgent}
            disabled={
              isCreatingAgent || (!selectedTemplate && !selectedContext)
            }
          >
            {isCreatingAgent ? 'Creating...' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* MCP Configuration Modal */}
      <Dialog open={isMcpModalOpen} onOpenChange={setIsMcpModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>MCP Server Configuration</DialogTitle>
            <DialogDescription>
              Select the MCP servers that your agent will be able to use to
              access external tools and resources.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <McpServerSelector
              onSelectionChange={() => {}}
              showConnectedServers={false}
            />
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {selectedServers.length > 0
                  ? `${selectedServers.length} server${selectedServers.length > 1 ? 's' : ''} selected`
                  : 'No server selected'}
              </div>
              <Button onClick={() => setIsMcpModalOpen(false)}>Done</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

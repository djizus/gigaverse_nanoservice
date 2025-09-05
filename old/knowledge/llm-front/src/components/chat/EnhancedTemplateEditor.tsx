import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Complete template structure matching agent configuration
interface EnhancedTemplate {
  id: string;
  name: string;
  description: string;
  
  // Model configuration
  modelType: 'anthropic' | 'openai' | null;
  modelId: string | null;
  
  // Context configuration
  contexts: string[];
  contextArgs: Record<string, any>;
  
  // Capabilities
  // capabilities: string[];
  
  // Instructions with variables
  instructions: string;
  variables: TemplateVariable[];
  
  // MCP configuration
  mcpServers?: string[];
  
  // Metadata
  tags?: string[];
  version?: string;
  examplePrompts?: string[];
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  defaultValue?: any;
  description?: string;
  options?: string[]; // For select type
  required?: boolean;
}

interface EnhancedTemplateEditorProps {
  templateId?: string;
  initialTemplate?: any;
  onSave: (template: EnhancedTemplate) => Promise<void>;
  onCancel: () => void;
}

// Available capabilities in the system
// const AVAILABLE_CAPABILITIES = [
//   'chat',
//   'memory',
//   'linear',
//   'issue-tracking',
//   'project-management',
//   'mcp',
//   'knowledge-search',
//   'document-management',
//   'notion',
//   'discord',
// ];

// Available context types
const CONTEXT_TYPES = [
  { value: 'chat', label: 'Chat', description: 'Basic conversation context' },
  { value: 'linear', label: 'Linear', description: 'Linear project management' },
  { value: 'notion', label: 'Notion', description: 'Notion integration' },
  { value: 'discord', label: 'Discord', description: 'Discord bot context' },
];

// Available models
const MODELS = {
  anthropic: [
    { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  openai: [
    { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

export function EnhancedTemplateEditor({ templateId, initialTemplate, onSave, onCancel }: EnhancedTemplateEditorProps) {
  console.log('🎨 EnhancedTemplateEditor props:', { templateId, initialTemplate });
  
  const [template, setTemplate] = useState<EnhancedTemplate>(() => {
    if (initialTemplate) {
      console.log('📝 Using initial template:', initialTemplate);
      return {
        id: initialTemplate.id || '',
        name: initialTemplate.name || '',
        description: initialTemplate.description || '',
        modelType: initialTemplate.model_type || 'anthropic',
        modelId: initialTemplate.model_id || 'claude-3-5-sonnet-latest',
        contexts: initialTemplate.contexts || ['chat'],
        contextArgs: initialTemplate.context_args || {},
        // capabilities: initialTemplate.capabilities || ['chat', 'memory'],
        instructions: initialTemplate.instructions || '',
        variables: initialTemplate.variables || [],
        tags: initialTemplate.tags || [],
        version: initialTemplate.version || '1.0.0',
        examplePrompts: initialTemplate.example_prompts || [],
      };
    }
    return {
      id: '',
      name: '',
      description: '',
      modelType: 'anthropic',
      modelId: 'claude-3-5-sonnet-latest',
      contexts: ['chat'],
      contextArgs: {},
      // capabilities: ['chat', 'memory'],
      instructions: '',
      variables: [],
      tags: [],
      version: '1.0.0',
      examplePrompts: [],
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'context' | 'instructions' | 'preview'>('basic');
  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: '',
    type: 'text',
    defaultValue: '',
    description: '',
  });
  const [newTag, setNewTag] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    } else if (initialTemplate) {
      // Use initial template when creating new
      setTemplate({
        id: initialTemplate.id || '',
        name: initialTemplate.name || '',
        description: initialTemplate.description || '',
        modelType: initialTemplate.model_type || 'anthropic',
        modelId: initialTemplate.model_id || 'claude-3-5-sonnet-latest',
        contexts: initialTemplate.contexts || ['chat'],
        contextArgs: initialTemplate.context_args || {},
        // capabilities: initialTemplate.capabilities || ['chat', 'memory'],
        instructions: initialTemplate.instructions || '',
        variables: initialTemplate.variables || [],
        tags: initialTemplate.tags || [],
        version: initialTemplate.version || '1.0.0',
        examplePrompts: initialTemplate.example_prompts || [],
      });
    }
  }, [templateId, initialTemplate]);

  const fetchTemplate = async () => {
    if (!templateId) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/daydreams/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Map the backend template to our enhanced structure
        setTemplate({
          ...data.template,
          modelType: data.template.model_type || 'anthropic',
          modelId: data.template.model_id || 'claude-3-5-sonnet-latest',
          contexts: data.template.contexts || ['chat'],
          contextArgs: data.template.context_args || {},
          // capabilities: data.template.capabilities || ['chat', 'memory'],
          instructions: data.template.instructions || '',
          variables: data.template.variables || [],
          tags: data.template.tags || [],
          examplePrompts: data.template.example_prompts || [],
        });
      }
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!template.name || !template.description) {
      alert('Please fill in the name and description fields');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Map to backend format - use contextType for DaydreamsController compatibility
      const templateToSave = {
        id: template.id || `template-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: template.name,
        description: template.description,
        model_type: template.modelType || 'anthropic',
        model_id: template.modelId || 'claude-3-5-sonnet-latest',
        // For backward compatibility with DaydreamsController
        contextType: template.contexts?.[0] || 'chat',
        content: template.instructions || '',
        // Also send new format
        contexts: template.contexts || ['chat'],
        context_args: template.contextArgs || {},
        // capabilities: template.capabilities || ['chat', 'memory'],
        instructions: template.instructions || '',
        variables: template.variables || [],
        mcpServers: template.mcpServers || [],
        tags: template.tags || [],
        version: template.version || '1.0.0',
        example_prompts: template.examplePrompts || [],
        defaultArgs: template.contextArgs || {},
      };
      
      console.log('💾 [EnhancedTemplateEditor] Saving template:', templateToSave);
      console.log('Template state before save:', template);
      
      await onSave(templateToSave as any);
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addVariable = () => {
    if (newVariable.name) {
      setTemplate({
        ...template,
        variables: [...template.variables, { ...newVariable }],
      });
      setNewVariable({
        name: '',
        type: 'text',
        defaultValue: '',
        description: '',
      });
    }
  };

  const removeVariable = (index: number) => {
    setTemplate({
      ...template,
      variables: template.variables.filter((_, i) => i !== index),
    });
  };

  // const toggleCapability = (capability: string) => {
  //   const capabilities = template.capabilities.includes(capability)
  //     ? template.capabilities.filter(c => c !== capability)
  //     : [...template.capabilities, capability];
  //   
  //   setTemplate({ ...template, capabilities });
  // };

  const toggleContext = (context: string) => {
    const contexts = template.contexts.includes(context)
      ? template.contexts.filter(c => c !== context)
      : [...template.contexts, context];
    
    setTemplate({ ...template, contexts });
  };

  const addTag = () => {
    if (newTag && !template.tags?.includes(newTag)) {
      setTemplate({
        ...template,
        tags: [...(template.tags || []), newTag],
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTemplate({
      ...template,
      tags: template.tags?.filter(t => t !== tag) || [],
    });
  };

  const addExamplePrompt = () => {
    if (newPrompt) {
      setTemplate({
        ...template,
        examplePrompts: [...(template.examplePrompts || []), newPrompt],
      });
      setNewPrompt('');
    }
  };

  const removeExamplePrompt = (index: number) => {
    setTemplate({
      ...template,
      examplePrompts: template.examplePrompts?.filter((_, i) => i !== index) || [],
    });
  };

  const renderPreview = () => {
    let preview = template.instructions;
    
    // Replace variables with their default values for preview
    template.variables.forEach(variable => {
      const value = variable.defaultValue || `[${variable.name}]`;
      preview = preview.replace(new RegExp(`{{${variable.name}}}`, 'g'), value);
    });

    return preview;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="context">Context & Capabilities</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
              <CardDescription>Basic configuration for the agent template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={template.name}
                    onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    placeholder="e.g., Linear Project Manager"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={template.version}
                    onChange={(e) => setTemplate({ ...template, version: e.target.value })}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={template.description}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  placeholder="Describe what this agent template does..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model Type</Label>
                  <Select
                    value={template.modelType || 'anthropic'}
                    onValueChange={(v) => setTemplate({ ...template, modelType: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={template.modelId || ''}
                    onValueChange={(v) => setTemplate({ ...template, modelId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {template.modelType && MODELS[template.modelType].map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {template.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Context Types</CardTitle>
              <CardDescription>Select the contexts this agent will use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {CONTEXT_TYPES.map(context => (
                  <div key={context.value} className="flex items-start space-x-3">
                    <Switch
                      checked={template.contexts.includes(context.value)}
                      onCheckedChange={() => toggleContext(context.value)}
                    />
                    <div className="flex-1">
                      <Label className="font-medium">{context.label}</Label>
                      <p className="text-sm text-muted-foreground">{context.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {template.contexts.includes('linear') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Linear Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={template.contextArgs.linear?.autoConnect || false}
                        onCheckedChange={(checked) => setTemplate({
                          ...template,
                          contextArgs: {
                            ...template.contextArgs,
                            linear: { ...template.contextArgs.linear, autoConnect: checked }
                          }
                        })}
                      />
                      <Label>Auto-connect on startup</Label>
                    </div>
                    <Input
                      placeholder="Team ID (optional)"
                      value={template.contextArgs.linear?.teamId || ''}
                      onChange={(e) => setTemplate({
                        ...template,
                        contextArgs: {
                          ...template.contextArgs,
                          linear: { ...template.contextArgs.linear, teamId: e.target.value }
                        }
                      })}
                    />
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
              <CardDescription>Select the capabilities this agent will have</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {AVAILABLE_CAPABILITIES.map(capability => (
                  <div key={capability} className="flex items-center space-x-2">
                    <Switch
                      checked={template.capabilities.includes(capability)}
                      onCheckedChange={() => toggleCapability(capability)}
                    />
                    <Label className="text-sm capitalize">{capability.replace('-', ' ')}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card> */}
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Instructions</CardTitle>
              <CardDescription>
                Define the agent's behavior. Use {'{{variableName}}'} for dynamic variables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={template.instructions}
                onChange={(e) => setTemplate({ ...template, instructions: e.target.value })}
                placeholder="You are an AI assistant specialized in..."
                rows={10}
                className="font-mono text-sm"
              />

              <div className="space-y-2">
                <Label>Template Variables</Label>
                <div className="space-y-2">
                  {template.variables.map((variable, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex-1">
                          <div className="font-medium">{`{{${variable.name}}}`}</div>
                          <div className="text-sm text-muted-foreground">
                            {variable.description || 'No description'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Type: {variable.type} | Default: {variable.defaultValue || 'none'}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariable(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Add Variable</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Variable name"
                        value={newVariable.name}
                        onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                      />
                      <Select
                        value={newVariable.type}
                        onValueChange={(v) => setNewVariable({ ...newVariable, type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      placeholder="Description"
                      value={newVariable.description}
                      onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                    />
                    <Input
                      placeholder="Default value"
                      value={newVariable.defaultValue}
                      onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                    />
                    <Button type="button" onClick={addVariable} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Add Variable
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>Example Prompts</Label>
                <div className="space-y-2">
                  {template.examplePrompts?.map((prompt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={prompt} readOnly className="flex-1" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExamplePrompt(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Add an example prompt..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExamplePrompt())}
                  />
                  <Button type="button" onClick={addExamplePrompt} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
              <CardDescription>See how your template will look when applied</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm">{template.name || 'Unnamed Template'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Model</Label>
                  <p className="text-sm">{template.modelId || 'Not selected'}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Contexts</Label>
                <div className="flex gap-2 mt-1">
                  {template.contexts.map(context => (
                    <Badge key={context} variant="outline">{context}</Badge>
                  ))}
                </div>
              </div>

              {/* <div>
                <Label className="text-sm font-medium">Capabilities</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {template.capabilities.map(cap => (
                    <Badge key={cap} variant="secondary">{cap}</Badge>
                  ))}
                </div>
              </div> */}

              <div>
                <Label className="text-sm font-medium">Instructions (with variables replaced)</Label>
                <Card className="mt-2">
                  <CardContent className="p-4">
                    <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                      {renderPreview()}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              </div>

              {template.variables.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Variables</Label>
                  <div className="space-y-2 mt-2">
                    {template.variables.map(variable => (
                      <div key={variable.name} className="flex items-center justify-between p-2 bg-muted rounded">
                        <code className="text-sm">{`{{${variable.name}}}`}</code>
                        <span className="text-sm text-muted-foreground">{variable.defaultValue || 'No default'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentService } from '@/services/agent.service';

interface Template {
  id: string;
  name: string;
  description: string;
  instructions: string;
  variables: Array<{
    name: string;
    description: string;
    defaultValue?: string;
  }>;
}

export function CreateAgentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [agentName, setAgentName] = useState('');
  const [modelType, setModelType] = useState<'anthropic' | 'openai'>(
    'anthropic',
  );
  const [modelId, setModelId] = useState('claude-3-5-sonnet-20241022');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/daydreams/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    setSelectedTemplate(template || null);

    // Initialize variable values with defaults
    if (template) {
      const initialValues: Record<string, string> = {};
      template.variables.forEach((variable) => {
        initialValues[variable.name] = variable.defaultValue || '';
      });
      setVariableValues(initialValues);
    }
  };

  const handleVariableChange = (variableName: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variableName]: value,
    }));
  };

  const renderTemplateInstructions = (instructions: string) => {
    let renderedInstructions = instructions;

    // Replace variables with their values
    Object.entries(variableValues).forEach(([variable, value]) => {
      const placeholder = `{{${variable}}}`;
      renderedInstructions = renderedInstructions.replace(
        new RegExp(placeholder, 'g'),
        value,
      );
    });

    return renderedInstructions;
  };

  const handleCreateAgent = async () => {
    if (!selectedTemplate || !agentName.trim()) {
      alert('Please select a template and provide an agent name');
      return;
    }

    setLoading(true);
    try {
      const renderedInstructions = renderTemplateInstructions(
        selectedTemplate.instructions,
      );

      const agentData = {
        id: agentName.toLowerCase().replace(/\s+/g, '-'),
        name: agentName,
        instructions: renderedInstructions,
        modelType,
        modelId,
        templateId: selectedTemplate.id,
        variables: variableValues,
      };

      const agent = await AgentService.createAgent(agentData);

      if (agent) {
        alert('Agent created successfully!');
        navigate({ to: '/agents' });
      } else {
        alert('Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Error creating agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Agent</h1>
        <p className="text-gray-600">Create a new AI agent from a template</p>
      </div>

      <div className="grid gap-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Template</CardTitle>
            <CardDescription>Choose a template for your agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template">Template</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="space-y-4">
                  <div>
                    <Label>Template Description</Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  {selectedTemplate.variables.length > 0 && (
                    <div>
                      <Label>Template Variables</Label>
                      <div className="space-y-2 mt-2">
                        {selectedTemplate.variables.map((variable) => (
                          <div key={variable.name}>
                            <Label htmlFor={variable.name} className="text-sm">
                              {variable.name}
                              {variable.description && (
                                <span className="text-gray-500 ml-2">
                                  ({variable.description})
                                </span>
                              )}
                            </Label>
                            <Textarea
                              id={variable.name}
                              value={variableValues[variable.name] || ''}
                              onChange={(e) =>
                                handleVariableChange(
                                  variable.name,
                                  e.target.value,
                                )
                              }
                              placeholder={
                                variable.defaultValue ||
                                `Enter ${variable.name}`
                              }
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Rendered Instructions</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded border text-sm whitespace-pre-wrap">
                      {renderTemplateInstructions(
                        selectedTemplate.instructions,
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agent Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>2. Agent Configuration</CardTitle>
            <CardDescription>Configure your agent settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="agentName">Agent Name</Label>
                <input
                  id="agentName"
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  className="w-full p-2 border rounded mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="modelType">Model Type</Label>
                  <Select
                    value={modelType}
                    onValueChange={(value: 'anthropic' | 'openai') =>
                      setModelType(value)
                    }
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

                <div>
                  <Label htmlFor="modelId">Model ID</Label>
                  <Select value={modelId} onValueChange={setModelId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3-5-sonnet-20241022">
                        Claude 3.5 Sonnet
                      </SelectItem>
                      <SelectItem value="claude-3-opus-20240229">
                        Claude 3 Opus
                      </SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCreateAgent}
            disabled={loading || !selectedTemplate || !agentName.trim()}
            className="px-8"
          >
            {loading ? 'Creating...' : 'Create Agent'}
          </Button>
        </div>
      </div>
    </div>
  );
}

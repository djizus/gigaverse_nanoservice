import React, { useState, useEffect } from 'react';
import '../styles/TemplateManager.css';
import { EnhancedTemplateEditor } from './chat/EnhancedTemplateEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Types pour les templates
interface TemplateVariable {
  name: string;
  description: string;
  type?: 'text' | 'number' | 'boolean' | 'select';
  defaultValue?: any;
  options?: string[];
  required?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  model_type?: 'anthropic' | 'openai' | null;
  model_id?: string | null;
  instructions: string;
  contexts?: string[];
  context_args?: Record<string, any>;
  capabilities?: string[];
  variables: TemplateVariable[];
  example_prompts?: string[];
  tags?: string[];
  version?: string;
  created_at?: string;
  updated_at?: string;
  mcpServers?: string[];
}

// URL de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TemplateManager: React.FC = () => {
  // États
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [editing, setEditing] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // État du formulaire d'édition
  const [formState, setFormState] = useState<Template>({
    id: '',
    name: '',
    description: '',
    instructions: '',
    variables: [],
    model_type: 'anthropic',
    model_id: 'claude-3-5-sonnet-20241022',
    contexts: [],
    context_args: {},
    capabilities: [],
    example_prompts: [],
    tags: [],
    version: '1.0.0',
  });

  // Variables pour le rendu du template
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [renderedContent, setRenderedContent] = useState<string>('');

  // Charger tous les templates au démarrage
  useEffect(() => {
    loadTemplates();
  }, []);

  // Fonction pour charger tous les templates
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/daydreams/templates`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.json();
      console.log('📋 Templates loaded:', data.templates);
      setTemplates(data.templates || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load templates: ${err}`);
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour sélectionner un template
  const selectTemplate = (template: Template) => {
    console.log('🎯 Selected template:', template);
    setSelectedTemplate(template);
    setVariableValues(
      template.variables.reduce(
        (acc, variable) => {
          acc[variable.name] = variable.defaultValue || '';
          return acc;
        },
        {} as Record<string, string>,
      ),
    );
    setRenderedContent('');
  };

  // Fonction pour rendre un template
  const renderTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(
        `${API_URL}/daydreams/templates/${selectedTemplate.id}/render`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variables: variableValues,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRenderedContent(data.rendered);
      } else {
        setError(data.error || 'Failed to render template');
      }
    } catch (err) {
      setError(`Failed to render template: ${err}`);
      console.error('Error rendering template:', err);
    }
  };

  // Fonction pour commencer à éditer un template
  const startEditing = (template: Template) => {
    setFormState({ ...template });
    setEditing(true);
    setCreating(false);
  };

  // Fonction pour commencer à créer un nouveau template
  const startCreating = () => {
    console.log('🚀 Starting template creation');
    const newTemplate = {
      id: `template-${Date.now()}`,
      name: '',
      description: '',
      instructions: '',
      variables: [],
      model_type: 'anthropic' as 'anthropic' | 'openai' | null,
      model_id: 'claude-3-5-sonnet-latest' as string | null,
      contexts: ['chat'],
      context_args: {},
      capabilities: ['chat', 'memory'],
      example_prompts: [],
      tags: [],
      version: '1.0.0',
    };
    console.log('📝 New template state:', newTemplate);
    setFormState(newTemplate);
    setEditing(false);
    setCreating(true);
    console.log('✅ Creating state set to true');
  };

  // Fonction pour annuler l'édition ou la création
  const cancelEdit = () => {
    setEditing(false);
    setCreating(false);
  };

  // Fonction pour mettre à jour le formulaire
  const updateForm = (field: keyof Template, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Fonction pour ajouter une variable
  const addVariable = () => {
    setFormState((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        {
          name: '',
          description: '',
          type: 'text',
          defaultValue: '',
          required: false,
        },
      ],
    }));
  };

  // Fonction pour mettre à jour une variable
  const updateVariable = (
    index: number,
    field: keyof TemplateVariable,
    value: string | boolean,
  ) => {
    setFormState((prev) => {
      const variables = [...prev.variables];
      variables[index] = { ...variables[index], [field]: value };
      return { ...prev, variables };
    });
  };

  // Fonction pour supprimer une variable
  const deleteVariable = (index: number) => {
    setFormState((prev) => {
      const variables = prev.variables.filter((_, i) => i !== index);
      return { ...prev, variables };
    });
  };

  // Fonction pour sauvegarder les modifications
  const saveTemplate = async () => {
    try {
      const url = editing
        ? `${API_URL}/daydreams/templates/${formState.id}`
        : `${API_URL}/daydreams/templates`;

      const method = editing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formState),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setEditing(false);
        setCreating(false);
        loadTemplates();
      } else {
        setError(data.error || 'Failed to save template');
      }
    } catch (err) {
      setError(`Failed to save template: ${err}`);
      console.error('Error saving template:', err);
    }
  };

  // Fonction pour supprimer un template
  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/daydreams/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null);
        }
        loadTemplates();
      } else {
        setError(data.error || 'Failed to delete template');
      }
    } catch (err) {
      setError(`Failed to delete template: ${err}`);
      console.error('Error deleting template:', err);
    }
  };

  // Création d'un agent avec le template
  const createAgent = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(
        `${API_URL}/daydreams/agents/with-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId: selectedTemplate.id,
            variables: variableValues,
            modelType: 'anthropic',
            modelId: 'claude-3-7-sonnet-latest',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        alert(`Agent created successfully with ID: ${data.agentId}`);
      } else {
        setError(data.error || 'Failed to create agent');
      }
    } catch (err) {
      setError(`Failed to create agent: ${err}`);
      console.error('Error creating agent:', err);
    }
  };

  // Fonction pour importer un template depuis un fichier JSON
  const importTemplateFromFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const templateData = JSON.parse(text);

      const response = await fetch(`${API_URL}/daydreams/templates/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        loadTemplates();
        alert(`Template imported successfully with ID: ${data.templateId}`);
      } else {
        setError(data.error || 'Failed to import template');
      }
    } catch (err) {
      setError(`Failed to import template: ${err}`);
      console.error('Error importing template:', err);
    }
  };

  // Affichage de l'interface
  return (
    <div className="template-manager">
      <h2>Template Manager</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="template-layout">
        <div className="template-list">
          <div className="template-list-header">
            <h3>Templates</h3>
            <div className="template-actions">
              <button onClick={startCreating} className="create-button">
                New Template
              </button>
              <label className="import-button">
                Import Template
                <input
                  type="file"
                  accept=".json"
                  onChange={importTemplateFromFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="no-templates">No templates available</div>
          ) : (
            <ul>
              {templates.map((template) => (
                <li
                  key={template.id}
                  className={
                    selectedTemplate?.id === template.id ? 'selected' : ''
                  }
                  onClick={() => selectTemplate(template)}
                >
                  <div className="template-item-name">{template.name}</div>
                  <div className="template-item-description">
                    {template.description}
                  </div>
                  <div className="template-item-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(template);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Enhanced Template Editor Dialog */}
        <Dialog open={editing || creating} onOpenChange={(open) => {
          console.log('📖 Dialog state change:', { open, editing, creating });
          if (!open) {
            setEditing(false);
            setCreating(false);
            setFormState({
              id: '',
              name: '',
              description: '',
              instructions: '',
              variables: [],
              contexts: ['chat'],
              capabilities: ['chat', 'memory'],
            });
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template' : 'Create Template'}</DialogTitle>
            </DialogHeader>
            <EnhancedTemplateEditor
              templateId={editing ? formState.id : undefined}
              initialTemplate={creating ? formState : undefined}
              onSave={async (template) => {
                try {
                  const token = localStorage.getItem('token');
                  const url = editing
                    ? `${API_URL}/daydreams/templates/${template.id}`
                    : `${API_URL}/daydreams/templates`;
                  
                  const method = editing ? 'PUT' : 'POST';
                  
                  const response = await fetch(url, {
                    method,
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token && { 'Authorization': `Bearer ${token}` }),
                    },
                    body: JSON.stringify(template),
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                  }
                  
                  const data = await response.json();
                  if (data.success || data.templateId || data.id) {
                    setEditing(false);
                    setCreating(false);
                    await loadTemplates(); // Reload templates
                  } else {
                    setError(data.error || 'Failed to save template');
                  }
                } catch (error) {
                  console.error('Error saving template:', error);
                  setError(error instanceof Error ? error.message : 'Failed to save template');
                }
              }}
              onCancel={() => {
                setEditing(false);
                setCreating(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Old editor - keep hidden for now */}
        {false && (
          <div className="template-editor">
            <h3>{editing ? 'Edit Template' : 'Create Template'}</h3>
            <div className="form-group">
              <label>ID:</label>
              <input
                type="text"
                value={formState.id}
                onChange={(e) => updateForm('id', e.target.value)}
                disabled={editing}
              />
            </div>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateForm('name', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <input
                type="text"
                value={formState.description}
                onChange={(e) => updateForm('description', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Model Type:</label>
              <select
                value={formState.model_type || 'anthropic'}
                onChange={(e) => updateForm('model_type', e.target.value as 'anthropic' | 'openai')}
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div className="form-group">
              <label>Model ID:</label>
              <input
                type="text"
                value={formState.model_id || ''}
                onChange={(e) => updateForm('model_id', e.target.value)}
                placeholder="claude-3-5-sonnet-20241022"
              />
            </div>
            <div className="form-group">
              <label>Instructions:</label>
              <textarea
                className="!min-h-[500px]"
                value={formState.instructions}
                onChange={(e) => updateForm('instructions', e.target.value)}
                rows={10}
                placeholder="Enter the instructions for this template..."
              />
            </div>
            <div className="form-group">
              <label>Contexts (comma separated):</label>
              <input
                type="text"
                value={formState.contexts?.join(', ') || ''}
                onChange={(e) =>
                  updateForm(
                    'contexts',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s),
                  )
                }
                placeholder="chat, notion, memory"
              />
            </div>
            <div className="form-group">
              <label>Capabilities (comma separated):</label>
              <input
                type="text"
                value={formState.capabilities?.join(', ') || ''}
                onChange={(e) =>
                  updateForm(
                    'capabilities',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s),
                  )
                }
                placeholder="search, create, update"
              />
            </div>
            <div className="form-group">
              <label>Tags (comma separated):</label>
              <input
                type="text"
                value={formState.tags?.join(', ') || ''}
                onChange={(e) =>
                  updateForm(
                    'tags',
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s),
                  )
                }
                placeholder="productivity, ai, assistant"
              />
            </div>
            <div className="form-group">
              <label>Example Prompts (comma separated):</label>
              <textarea
                value={formState.example_prompts?.join('\n') || ''}
                onChange={(e) =>
                  updateForm(
                    'example_prompts',
                    e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter((s) => s),
                  )
                }
                rows={4}
                placeholder="Enter example prompts, one per line"
              />
            </div>

            <div className="variables-section">
              <div className="variables-header">
                <h4>Variables</h4>
                <button onClick={addVariable}>Add Variable</button>
              </div>

              {formState.variables.map((variable, index) => (
                <div key={index} className="variable-item">
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) =>
                        updateVariable(index, 'name', e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <input
                      type="text"
                      value={variable.description}
                      onChange={(e) =>
                        updateVariable(index, 'description', e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Type:</label>
                    <select
                      value={variable.type || 'string'}
                      onChange={(e) =>
                        updateVariable(index, 'type', e.target.value)
                      }
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Default Value:</label>
                    <input
                      type="text"
                      value={variable.defaultValue || ''}
                      onChange={(e) =>
                        updateVariable(index, 'defaultValue', e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={variable.required || false}
                        onChange={(e) =>
                          updateVariable(index, 'required', e.target.checked)
                        }
                      />
                      Required
                    </label>
                  </div>
                  <button
                    className="delete-variable"
                    onClick={() => deleteVariable(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="editor-actions">
              <button onClick={saveTemplate} className="save-button">
                Save
              </button>
              <button onClick={cancelEdit} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}

        {selectedTemplate && !editing && !creating && (
          <div className="template-preview">
            <h3>Preview: {selectedTemplate.name}</h3>
            <p className="template-description">
              {selectedTemplate.description}
            </p>
            
            {/* Display template configuration */}
            <div className="template-config" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <h4>Configuration</h4>
              <div className="config-details">
                {selectedTemplate.model_type && (
                  <div><strong>Model:</strong> {selectedTemplate.model_type} - {selectedTemplate.model_id}</div>
                )}
                {selectedTemplate.contexts && selectedTemplate.contexts.length > 0 && (
                  <div><strong>Contexts:</strong> {selectedTemplate.contexts.join(', ')}</div>
                )}
                {selectedTemplate.capabilities && selectedTemplate.capabilities.length > 0 && (
                  <div><strong>Capabilities:</strong> {selectedTemplate.capabilities.join(', ')}</div>
                )}
                {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                  <div><strong>Tags:</strong> {selectedTemplate.tags.join(', ')}</div>
                )}
                {selectedTemplate.instructions && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Instructions:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: '5px', padding: '10px', backgroundColor: 'white', borderRadius: '3px' }}>
                      {selectedTemplate.instructions.substring(0, 500)}
                      {selectedTemplate.instructions.length > 500 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="variables-input">
              <h4>Template Variables</h4>
              {selectedTemplate.variables.map((variable) => (
                <div key={variable.name} className="variable-input-item">
                  <label>{variable.name}:</label>
                  <div className="variable-input-group">
                    <input
                      type="text"
                      value={variableValues[variable.name] || ''}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [variable.name]: e.target.value,
                        }))
                      }
                      placeholder={variable.description}
                    />
                    <div className="variable-description">
                      {variable.description}
                    </div>
                  </div>
                </div>
              ))}

              <div className="preview-actions">
                <button onClick={renderTemplate} className="render-button">
                  Render Template
                </button>
                <button onClick={createAgent} className="create-agent-button">
                  Create Agent with Template
                </button>
              </div>
            </div>

            {renderedContent && (
              <div className="rendered-content">
                <h4>Rendered Output</h4>
                <pre>{renderedContent}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;

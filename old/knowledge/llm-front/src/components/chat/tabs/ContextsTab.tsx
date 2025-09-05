import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { httpService } from '@/services/http.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface Template {
  id: string;
  name: string;
  description: string;
  content?: string;
  context: {
    type: string;
  };
  defaultArgs?: Record<string, unknown>;
}

interface Context {
  id: string;
  name?: string;
  description?: string;
}

export function ContextsTab() {
  const [contextDetails, setContextDetails] = useState<Context[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [activeInnerTab, setActiveInnerTab] = useState('contexts');

  // État pour la gestion des contextes
  const [showNewContextForm, setShowNewContextForm] = useState(false);
  const [contextFormMode, setContextFormMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [selectedContextForEdit, setSelectedContextForEdit] =
    useState<Context | null>(null);
  const [newContextId, setNewContextId] = useState('');
  const [newContextName, setNewContextName] = useState('');
  const [newContextDescription, setNewContextDescription] = useState('');
  const [isContextOperationInProgress, setIsContextOperationInProgress] =
    useState(false);

  // État pour la gestion des templates
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);
  const [templateFormMode, setTemplateFormMode] = useState<'create' | 'edit'>(
    'create',
  );
  const [selectedTemplateForEdit, setSelectedTemplateForEdit] =
    useState<Template | null>(null);
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [isTemplateOperationInProgress, setIsTemplateOperationInProgress] =
    useState(false);

  useEffect(() => {
    // Charger les contextes disponibles et les templates au chargement du composant
    loadAvailableContexts();
    loadTemplates();
  }, []);

  const loadAvailableContexts = async () => {
    try {
      const data = await httpService.get<{ contexts: string[] }>('/daydreams/contexts');
      if (data.contexts && data.contexts.length > 0) {
        const contexts = data.contexts.map((contextId: string) => ({
          id: contextId,
          name: contextId,
          description: '',
        }));
        setContextDetails(contexts);
      }
    } catch (error) {
      console.error('Error loading contexts:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await httpService.get<{ templates: Template[] }>('/daydreams/contexts/templates');
      if (data.templates && data.templates.length > 0) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Fonctions pour gérer les contextes
  const handleCreateContext = async () => {
    if (!newContextId.trim()) return;

    setIsContextOperationInProgress(true);
    try {
      const response = await fetch('/daydreams/contexts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newContextId,
          name: newContextName || newContextId,
          description: newContextDescription,
        }),
      });

      if (response.ok) {
        // Recharger les contextes après la création
        await loadAvailableContexts();
        resetContextForm();
        // Rafraîchir la liste des templates aussi
        await loadTemplates();
      } else {
        const data = await response.json();
        console.error('Error creating context:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error creating context:', error);
    } finally {
      setIsContextOperationInProgress(false);
    }
  };

  const handleEditContext = async () => {
    if (!selectedContextForEdit) return;

    setIsContextOperationInProgress(true);
    try {
      const response = await fetch(
        `${API_URL}/daydreams/contexts/${selectedContextForEdit.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newContextName,
            description: newContextDescription,
          }),
        },
      );

      if (response.ok) {
        // Recharger les contextes après la modification
        await loadAvailableContexts();
        resetContextForm();
      } else {
        const data = await response.json();
        console.error('Error updating context:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error updating context:', error);
    } finally {
      setIsContextOperationInProgress(false);
    }
  };

  const handleDeleteContext = async (contextId: string) => {
    if (
      !confirm(`Êtes-vous sûr de vouloir supprimer le contexte ${contextId} ?`)
    )
      return;

    try {
      const response = await fetch(
        `${API_URL}/daydreams/contexts/${contextId}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        // Recharger les contextes après la suppression
        await loadAvailableContexts();
        // Rafraîchir la liste des templates aussi
        await loadTemplates();
      } else {
        const data = await response.json();
        console.error('Error deleting context:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting context:', error);
    }
  };

  const startEditContext = (context: Context) => {
    setSelectedContextForEdit(context);
    setNewContextId(context.id);
    setNewContextName(context.name || '');
    setNewContextDescription(context.description || '');
    setContextFormMode('edit');
    setShowNewContextForm(true);
  };

  const resetContextForm = () => {
    setNewContextId('');
    setNewContextName('');
    setNewContextDescription('');
    setSelectedContextForEdit(null);
    setShowNewContextForm(false);
    setContextFormMode('create');
  };

  // === Gestion des templates ===

  const handleCreateTemplate = async () => {
    if (!newTemplateId.trim() || !selectedContext) return;

    setIsTemplateOperationInProgress(true);
    try {
      const response = await fetch('/daydreams/contexts/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newTemplateId,
          name: newTemplateName || newTemplateId,
          description: newTemplateDescription,
          content: newTemplateContent,
          contextType: selectedContext,
        }),
      });

      if (response.ok) {
        await loadTemplates();
        resetTemplateForm();
      } else {
        const data = await response.json();
        console.error(
          'Error creating template:',
          data.error || 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setIsTemplateOperationInProgress(false);
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplateForEdit || !selectedContext) return;

    setIsTemplateOperationInProgress(true);
    try {
      const response = await fetch(
        `${API_URL}/daydreams/templates/${selectedTemplateForEdit.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newTemplateName,
            description: newTemplateDescription,
            content: newTemplateContent,
            contextType: selectedContext,
          }),
        },
      );

      if (response.ok) {
        await loadTemplates();
        resetTemplateForm();
      } else {
        const data = await response.json();
        console.error(
          'Error updating template:',
          data.error || 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Error updating template:', error);
    } finally {
      setIsTemplateOperationInProgress(false);
    }
  };

  const handleDeleteTemplate = async (
    _contextId: string,
    templateId: string,
  ) => {
    if (
      !confirm(`Êtes-vous sûr de vouloir supprimer le template ${templateId} ?`)
    )
      return;

    try {
      const response = await fetch(
        `${API_URL}/daydreams/templates/${templateId}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        await loadTemplates();
      } else {
        const data = await response.json();
        console.error(
          'Error deleting template:',
          data.error || 'Unknown error',
        );
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const startEditTemplate = (template: Template) => {
    setSelectedTemplateForEdit(template);
    setNewTemplateId(template.id);
    setNewTemplateName(template.name || '');
    setNewTemplateDescription(template.description || '');
    setNewTemplateContent(template.content || '');
    setSelectedContext(template.context.type);
    setTemplateFormMode('edit');
    setShowNewTemplateForm(true);
  };

  const resetTemplateForm = () => {
    setNewTemplateId('');
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateContent('');
    setSelectedContext(null);
    setSelectedTemplateForEdit(null);
    setShowNewTemplateForm(false);
    setTemplateFormMode('create');
  };

  return (
    <div className="flex-1 flex flex-col">
      <Tabs
        value={activeInnerTab}
        onValueChange={setActiveInnerTab}
        className="w-full"
      >
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="contexts">Contextes</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="contexts" className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Contextes</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetContextForm();
                setShowNewContextForm(true);
                setContextFormMode('create');
              }}
            >
              Nouveau contexte
            </Button>
          </div>

          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="text-sm">
              Les contextes définissent l'environnement d'exécution de base pour
              vos agents. Vous pouvez ensuite créer des templates qui utilisent
              ces contextes avec des paramètres spécifiques.
            </p>
          </div>

          {showNewContextForm && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl mb-4 font-medium">
                  {contextFormMode === 'create'
                    ? 'Créer un nouveau contexte'
                    : 'Modifier le contexte'}
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    ID du contexte
                  </label>
                  <Input
                    type="text"
                    placeholder="ID unique (ex: chat-support)"
                    value={newContextId}
                    onChange={(e) => setNewContextId(e.target.value)}
                    className="mb-2 text-lg h-12"
                    disabled={contextFormMode === 'edit'}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Nom du contexte
                  </label>
                  <Input
                    type="text"
                    placeholder="Nom descriptif"
                    value={newContextName}
                    onChange={(e) => setNewContextName(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <Textarea
                    placeholder="Description du contexte"
                    value={newContextDescription}
                    onChange={(e) => setNewContextDescription(e.target.value)}
                    className="min-h-[100px] text-lg"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    size="lg"
                    onClick={
                      contextFormMode === 'create'
                        ? handleCreateContext
                        : handleEditContext
                    }
                    disabled={
                      isContextOperationInProgress ||
                      (contextFormMode === 'create' && !newContextId.trim())
                    }
                    className="px-6"
                  >
                    {isContextOperationInProgress
                      ? 'En cours...'
                      : contextFormMode === 'create'
                        ? 'Créer'
                        : 'Mettre à jour'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetContextForm}
                    className="px-6"
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <ScrollArea className="flex-1">
            {contextDetails.map((context) => (
              <div
                key={context.id}
                className="p-3 rounded-lg mb-3 border hover:bg-accent"
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-lg">
                    {context.name || context.id}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditContext(context)}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContext(context.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mt-1 flex items-center">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md mr-2">
                    ID: {context.id}
                  </span>
                  {context.id === 'chat' && (
                    <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs px-2 py-0.5 rounded-full">
                      Contexte par défaut
                    </span>
                  )}
                </div>

                {context.description && (
                  <div className="mt-2 text-sm">{context.description}</div>
                )}

                <div className="mt-3 text-xs">
                  <span className="text-muted-foreground">
                    Templates utilisant ce contexte :
                    {templates.filter((t) => t.context.type === context.id)
                      .length > 0
                      ? templates
                          .filter((t) => t.context.type === context.id)
                          .map((t) => t.name || t.id)
                          .join(', ')
                      : ' Aucun'}
                  </span>
                </div>
              </div>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Templates</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetTemplateForm();
                setShowNewTemplateForm(true);
                setTemplateFormMode('create');
              }}
            >
              Nouveau template
            </Button>
          </div>

          {showNewTemplateForm && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl mb-4 font-medium">
                  {templateFormMode === 'create'
                    ? 'Créer un nouveau template'
                    : 'Modifier le template'}
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    ID du template
                  </label>
                  <Input
                    type="text"
                    placeholder="ID unique (ex: assistant-support)"
                    value={newTemplateId}
                    onChange={(e) => setNewTemplateId(e.target.value)}
                    className="mb-2 text-lg h-12"
                    disabled={templateFormMode === 'edit'}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Nom du template
                  </label>
                  <Input
                    type="text"
                    placeholder="Nom descriptif"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <Textarea
                    placeholder="Description du template"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    className="min-h-[100px] text-lg"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Contenu du template
                  </label>
                  <Textarea
                    placeholder="Contenu du template avec variables {{variable}}"
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    className="min-h-[250px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilisez la syntaxe {'{{'} variable {'}}'} pour définir des
                    variables. Exemple: "Vous êtes {'{{'} role {'}}'} et votre
                    mission est de {'{{'} mission {'}}'} ."
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Contexte de base
                  </label>
                  <Select
                    value={selectedContext || ''}
                    onValueChange={setSelectedContext}
                  >
                    <SelectTrigger>
                      <SelectValue>Choisir un contexte</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {contextDetails.map((context) => (
                        <SelectItem key={context.id} value={context.id}>
                          {context.name || context.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedContext && (
                    <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                      <div className="font-medium">
                        Contexte sélectionné:{' '}
                        {contextDetails.find((c) => c.id === selectedContext)
                          ?.name || selectedContext}
                      </div>
                      {contextDetails.find((c) => c.id === selectedContext)
                        ?.description && (
                        <div className="mt-1 text-muted-foreground">
                          {
                            contextDetails.find((c) => c.id === selectedContext)
                              ?.description
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    size="lg"
                    onClick={
                      templateFormMode === 'create'
                        ? handleCreateTemplate
                        : handleEditTemplate
                    }
                    disabled={
                      isTemplateOperationInProgress ||
                      !selectedContext ||
                      (templateFormMode === 'create' && !newTemplateId.trim())
                    }
                    className="px-6"
                  >
                    {isTemplateOperationInProgress
                      ? 'En cours...'
                      : templateFormMode === 'create'
                        ? 'Créer'
                        : 'Mettre à jour'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetTemplateForm}
                    className="px-6"
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <ScrollArea className="flex-1">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-3 rounded-lg mb-3 border hover:bg-accent"
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-lg">
                    {template.name || template.id}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditTemplate(template)}
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDeleteTemplate(template.context.type, template.id)
                      }
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                <div className="text-sm mt-1 flex items-center flex-wrap gap-1">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                    ID: {template.id}
                  </span>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-2 py-0.5 rounded-md flex items-center">
                    <span className="mr-1">Contexte:</span>
                    <span className="font-medium">{template.context.type}</span>
                  </span>
                  {contextDetails.find((c) => c.id === template.context.type)
                    ?.name &&
                    template.context.type !==
                      contextDetails.find((c) => c.id === template.context.type)
                        ?.name && (
                      <span className="text-xs text-muted-foreground">
                        (
                        {
                          contextDetails.find(
                            (c) => c.id === template.context.type,
                          )?.name
                        }
                        )
                      </span>
                    )}
                </div>

                {template.description && (
                  <div className="mt-2 text-sm">{template.description}</div>
                )}

                {template.content && (
                  <div className="mt-3">
                    <button
                      className="text-xs text-blue-600 hover:underline mb-1 flex items-center"
                      onClick={() => {
                        const content = document.getElementById(
                          `content-${template.id}`,
                        );
                        if (content) {
                          content.style.display =
                            content.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                    >
                      <span>Afficher/masquer le contenu</span>
                    </button>
                    <pre
                      id={`content-${template.id}`}
                      className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap"
                      style={{ display: 'none' }}
                    >
                      {template.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

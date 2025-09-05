import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { httpService } from '@/services/http.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Edit, Trash2, Copy, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EnhancedTemplateEditor } from '@/components/chat/EnhancedTemplateEditor';

interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
}

interface ContextTemplate {
  id: string;
  name: string;
  description: string;
  content?: string;
  instructions?: string;
  variables?: TemplateVariable[];
  contexts?: string[];
  context?: {
    type: string;
  };
  context_args?: Record<string, unknown>;
  model_type?: string;
  model_id?: string;
  capabilities?: string[] | Record<string, boolean>;
  example_prompts?: string[];
  tags?: string[];
  version?: string;
  defaultArgs?: Record<string, unknown>; // For backward compatibility
}

interface CreateTemplateData {
  id?: string;
  name: string;
  description: string;
  instructions?: string;
  contexts?: string[];
  context_args?: Record<string, unknown>;
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<ContextTemplate[]>([]);
  const [, setContexts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // État pour la création/édition de templates
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [, setEditingTemplate] =
    useState<ContextTemplate | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    description: '',
    instructions: '',
    contexts: ['chat'],
    context_args: {},
  });

  useEffect(() => {
    loadTemplates();
    loadContexts();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await httpService.get<{ templates: ContextTemplate[] }>('/daydreams/templates');
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Impossible de charger les templates');
    } finally {
      setLoading(false);
    }
  };

  const loadContexts = async () => {
    try {
      const data = await httpService.get<{ contexts: string[] }>('/daydreams/contexts');
      setContexts(data.contexts || []);
    } catch (error) {
      console.error('Error loading contexts:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      instructions: '',
      contexts: ['chat'],
      context_args: {},
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (template: ContextTemplate) => {
    setEditingTemplate(template);
    setFormData({
      id: template.id,
      name: template.name,
      description: template.description,
      instructions: template.instructions || template.content || '',
      contexts: template.contexts || [template.context?.type || 'chat'],
      context_args: template.context_args || template.defaultArgs || {},
    });
    setIsEditDialogOpen(true);
  };

  // const handleCreateTemplate = async () => {
  //   if (!formData.name.trim()) {
  //     toast.error("Le nom est requis");
  //     return;
  //   }
  //
  //   try {
  //     await httpService.post('/templates', formData);
  //     toast.success('Template créé avec succès');
  //     setIsCreateDialogOpen(false);
  //     resetForm();
  //     loadTemplates();
  //   } catch (error) {
  //     console.error('Error creating template:', error);
  //     toast.error('Impossible de créer le template');
  //   }
  // };
  //
  // const handleUpdateTemplate = async () => {
  //   if (!editingTemplate) return;
  //
  //   try {
  //     await httpService.put(`/templates/${editingTemplate.id}`, {
  //       name: formData.name,
  //       description: formData.description,
  //       instructions: formData.instructions,
  //       contexts: formData.contexts,
  //       context_args: formData.context_args,
  //     });
  //
  //     toast.success('Template mis à jour avec succès');
  //     setIsEditDialogOpen(false);
  //     setEditingTemplate(null);
  //     resetForm();
  //     loadTemplates();
  //   } catch (error) {
  //     console.error('Error updating template:', error);
  //     toast.error('Impossible de mettre à jour le template');
  //   }
  // };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      await httpService.delete(`/templates/${templateToDelete}`);
      toast.success('Template supprimé avec succès');
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Impossible de supprimer le template');
      setTemplateToDelete(null);
    }
  };

  const handleDuplicateTemplate = async (template: ContextTemplate) => {
    try {
      const response = await httpService.post<{
        success: boolean;
        templateId?: string;
        error?: string;
      }>(`/templates/${template.id}/duplicate`, {
        name: `${template.name} (Copie)`,
      });
      
      if (response.success) {
        toast.success('Template dupliqué avec succès');
        loadTemplates();
      } else {
        throw new Error(response.error || 'Duplication failed');
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Impossible de dupliquer le template');
    }
  };

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Template Manager</h1>
              <p className="text-muted-foreground">
                Gérez vos templates de conversation et d'agents
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadTemplates}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Actualiser
              </Button>
              <Button onClick={openCreateDialog}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nouveau Template
              </Button>
            </div>
          </div>

          <Separator />

          {/* Templates Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Chargement des templates...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {template.context?.type || template.contexts?.[0] || 'chat'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {(template.content || template.instructions) && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Contenu:</p>
                          <div className="bg-muted p-2 rounded text-xs max-h-20 overflow-hidden">
                            {(template.content || template.instructions || '').substring(0, 100)}
                            {(template.content || template.instructions || '').length > 100 && '...'}
                          </div>
                        </div>
                      )}

                      {template.variables && template.variables.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Variables:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 3).map((variable) => (
                              <Badge
                                key={variable.name}
                                variant="outline"
                                className="text-xs"
                              >
                                {variable.name}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <code className="text-xs text-muted-foreground bg-muted px-1 rounded">
                          {template.id}
                        </code>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicateTemplate(template)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTemplateToDelete(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {templates.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <PlusCircle className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Aucun template trouvé</h3>
              <p className="text-muted-foreground mb-4">
                Créez votre premier template pour commencer
              </p>
              <Button onClick={openCreateDialog}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Créer un template
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de création */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau template</DialogTitle>
            <DialogDescription>
              Configurez tous les aspects de votre template d'agent
            </DialogDescription>
          </DialogHeader>
          
          <EnhancedTemplateEditor
            onSave={async (template) => {
              try {
                // const token = localStorage.getItem('token');
                
                // Log the template being sent
                console.log('📤 Sending template to backend:', template);
                
                const response = await httpService.post<any>('/daydreams/templates', template);
                
                console.log('📥 Response from backend:', response);
                
                if (response.success || response.templateId) {
                  toast.success('Template créé avec succès');
                  await loadTemplates();
                  setIsCreateDialogOpen(false);
                } else {
                  toast.error(response.error || 'Erreur lors de la création');
                }
              } catch (error) {
                console.error('Error creating template:', error);
                toast.error('Erreur lors de la création du template');
              }
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
            <DialogDescription>
              Modifiez tous les aspects de votre template d'agent
            </DialogDescription>
          </DialogHeader>
          
          <EnhancedTemplateEditor
            templateId={formData.id}
            initialTemplate={formData}
            onSave={async (template) => {
              try {
                // const token = localStorage.getItem('token');
                const response = await httpService.put(
                  `/daydreams/templates/${template.id}`,
                  template
                ) as any;
                
                if (response.success) {
                  toast.success('Template modifié avec succès');
                  await loadTemplates();
                  setIsEditDialogOpen(false);
                } else {
                  toast.error(response.error || 'Erreur lors de la modification');
                }
              } catch (error) {
                console.error('Error updating template:', error);
                toast.error('Erreur lors de la modification du template');
              }
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!templateToDelete} 
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le template</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce template ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

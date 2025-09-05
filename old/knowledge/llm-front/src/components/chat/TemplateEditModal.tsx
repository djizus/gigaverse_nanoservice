import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '@/components/ui/card';

interface Template {
  id: string;
  name: string;
  description: string;
  content?: string;
  contextType: string;
  defaultArgs?: Record<string, Record<string, unknown>>;
}

interface TemplateEditorProps {
  templateId?: string;
  onSave: (template: Template) => Promise<void>;
}

export function TemplateEditor({ templateId, onSave }: TemplateEditorProps) {
  const [template, setTemplate] = useState<Template>({
    id: '',
    name: '',
    description: '',
    content: '',
    contextType: 'general',
    defaultArgs: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    } else {
      // Reset form for new template
      setTemplate({
        id: '',
        name: '',
        description: '',
        content: '',
        contextType: 'general',
        defaultArgs: {},
      });
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    if (!templateId) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/api/daydreams/templates/${templateId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await onSave(template);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={template.name}
                  onChange={(e) =>
                    setTemplate({ ...template, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={template.description}
                  onChange={(e) =>
                    setTemplate({ ...template, description: e.target.value })
                  }
                  required
                />
              </div>

            </div>

            <div className="flex-1 min-h-[600px]">
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab(value as 'edit' | 'preview')
                }
                className="h-full flex flex-col"
              >
                <TabsList>
                  <TabsTrigger value="edit">Éditer</TabsTrigger>
                  <TabsTrigger value="preview">Prévisualiser</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="edit"
                  className="flex-1 mt-0 h-[calc(100vh-300px)] min-h-"
                >
                  <Textarea
                    id="content"
                    value={template.content}
                    onChange={(e) =>
                      setTemplate({ ...template, content: e.target.value })
                    }
                    className="h-full w-full min-h-96 font-mono resize-none"
                  />
                </TabsContent>
                <TabsContent
                  value="preview"
                  className="flex-1 mt-0 border rounded-md p-4 overflow-auto bg-background h-[calc(100vh-300px)] min-h-90"
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{template.content || ''}</ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

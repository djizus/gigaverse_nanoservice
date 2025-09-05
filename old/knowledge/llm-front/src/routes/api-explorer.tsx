import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { JsonView } from '@/components/ui/json-view';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse {
  success?: boolean;
  error?: string;
  data?: any;
}

export function ApiExplorerPage() {
  const [selectedTab, setSelectedTab] = useState('agents');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // État pour les formulaires
  const [agentForm, setAgentForm] = useState({
    modelType: 'anthropic',
    modelId: 'claude-3-7-sonnet-latest',
    contexts: ['chat'],
    contextArgs: {
      chat: {
        sessionId: crypto.randomUUID(),
        userId: 'default-user',
      },
    },
  });

  const [messageForm, setMessageForm] = useState({
    agentId: '',
    contextId: '',
    message: '',
    userId: 'user',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    variables: {},
  });

  // Fonction générique pour les appels API
  const callApi = async (
    endpoint: string,
    method: string = 'GET',
    body?: any,
  ) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      setResponse(data);
    } catch (error) {
      setResponse({ success: false, error: 'Failed to call API' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">API Explorer</h1>
        <div className="space-x-2">
          <Link to="/">
            <Button variant="outline">Simple Chat</Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline">Advanced Chat</Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 grid grid-rows-[1fr,auto] overflow-hidden">
        <div className="overflow-auto p-4">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="h-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="contexts">Contexts</TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agents Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={() => callApi('/daydreams/agents')}>
                        List All Agents
                      </Button>
                      <Button
                        onClick={() => {
                          if (agentForm.modelType && agentForm.modelId) {
                            callApi('/daydreams/agents', 'POST', agentForm);
                          }
                        }}
                      >
                        Create New Agent
                      </Button>
                    </div>

                    {/* Create Agent Form - Une ligne */}
                    <div>
                      <Label>Create Agent Form</Label>
                      <div className="flex gap-4 mt-2">
                        <Input
                          placeholder="Model Type (anthropic/openai)"
                          value={agentForm.modelType}
                          onChange={(e) =>
                            setAgentForm({
                              ...agentForm,
                              modelType: e.target.value,
                            })
                          }
                          className="flex-1"
                        />
                        <Input
                          placeholder="Model ID"
                          value={agentForm.modelId}
                          onChange={(e) =>
                            setAgentForm({
                              ...agentForm,
                              modelId: e.target.value,
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* Send Message Form - Une ligne */}
                    <div>
                      <Label>Send Message</Label>
                      <div className="flex gap-4 mt-2">
                        <Input
                          placeholder="Agent ID"
                          value={messageForm.agentId}
                          onChange={(e) =>
                            setMessageForm({
                              ...messageForm,
                              agentId: e.target.value,
                            })
                          }
                          className="w-1/4"
                        />
                        <Input
                          placeholder="Context ID"
                          value={messageForm.contextId}
                          onChange={(e) =>
                            setMessageForm({
                              ...messageForm,
                              contextId: e.target.value,
                            })
                          }
                          className="w-1/4"
                        />
                        <div className="flex-1 flex gap-2">
                          <Input
                            placeholder="Message"
                            value={messageForm.message}
                            onChange={(e) =>
                              setMessageForm({
                                ...messageForm,
                                message: e.target.value,
                              })
                            }
                          />
                          <Button
                            onClick={() => {
                              if (
                                messageForm.agentId &&
                                messageForm.contextId &&
                                messageForm.message
                              ) {
                                callApi(
                                  `/daydreams/agents/${messageForm.agentId}/send`,
                                  'POST',
                                  {
                                    contextId: messageForm.contextId,
                                    message: messageForm.message,
                                    userId: messageForm.userId,
                                  },
                                );
                              }
                            }}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* API Response */}
                    <div className="mt-8">
                      <Label className="text-lg font-semibold">
                        API Response
                      </Label>
                      <div className="mt-2 rounded-md border">
                        <ScrollArea className="h-[400px] w-full p-4">
                          {loading ? (
                            <div className="flex justify-center items-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : response ? (
                            <div className="font-mono text-sm">
                              <JsonView data={response} />
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              No response yet. Try making an API call.
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Templates Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={() => callApi('/templates')}>
                        List All Templates
                      </Button>
                      <Button
                        onClick={() => {
                          if (templateForm.name && templateForm.content) {
                            callApi('/templates', 'POST', templateForm);
                          }
                        }}
                      >
                        Create Template
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Create Template Form</Label>
                      <Input
                        placeholder="Template Name"
                        value={templateForm.name}
                        onChange={(e) =>
                          setTemplateForm({
                            ...templateForm,
                            name: e.target.value,
                          })
                        }
                      />
                      <Textarea
                        placeholder="Template Content"
                        value={templateForm.content}
                        onChange={(e) =>
                          setTemplateForm({
                            ...templateForm,
                            content: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* API Response */}
                    <div className="mt-8">
                      <Label className="text-lg font-semibold">
                        API Response
                      </Label>
                      <div className="mt-2 rounded-md border">
                        <ScrollArea className="h-[400px] w-full p-4">
                          {loading ? (
                            <div className="flex justify-center items-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : response ? (
                            <div className="font-mono text-sm">
                              <JsonView data={response} />
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              No response yet. Try making an API call.
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contexts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contexts Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={() => callApi('/daydreams/contexts')}>
                        List Available Contexts
                      </Button>
                      <Button onClick={() => callApi('/daydreams/templates')}>
                        List Context Templates
                      </Button>
                    </div>

                    {/* API Response */}
                    <div className="mt-8">
                      <Label className="text-lg font-semibold">
                        API Response
                      </Label>
                      <div className="mt-2 rounded-md border">
                        <ScrollArea className="h-[400px] w-full p-4">
                          {loading ? (
                            <div className="flex justify-center items-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          ) : response ? (
                            <div className="font-mono text-sm">
                              <JsonView data={response} />
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              No response yet. Try making an API call.
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

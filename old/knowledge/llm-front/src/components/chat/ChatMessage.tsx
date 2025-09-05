'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronUp,
  Brain,
  Cog,
  FileText,
  Code as CodeIcon,
} from 'lucide-react';

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  rawResponse?: any[];
  isStreaming?: boolean;
  streamingContent?: string;
}

/**
 * ChatMessage component
 * ---------------------------------------------------------------------
 * Affiche un message utilisateur / assistant avec :
 *  - Avatar, badge et horodatage
 *  - Boutons copier / télécharger
 *  - Streaming indicator
 *  - Onglets (thought, action, output, raw) pour le détail de rawResponse
 *
 * Les propriétés style reposent sur Tailwind + shadcn/ui.
 */
export function ChatMessage({
  role,
  content,
  timestamp,
  rawResponse,
  isStreaming,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTab, setSelectedTab] = useState('thought');
  const isUser = role === 'user';
  const [showDetails, setShowDetails] = useState(false);

  /* ------------------------------------------------------------------
   * Helpers
   * ----------------------------------------------------------------*/
  const formatTimestamp = (ts: number) =>
    new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch (err) {
      /* eslint-disable no-console */
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-message-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Concatène les réponses par type (thought, action, output, ...)
   */
  const groupResponses = (responses: any[] = []) => {
    return responses.reduce<Record<string, any[]>>((acc, item) => {
      const key = item.ref || 'other';
      if (!acc[key]) acc[key] = [];

      // Gestion particulière pour les outputs de streaming
      if (
        key === 'output' &&
        item.type === 'chat:response' &&
        (item as any).streamingId
      ) {
        const idx = acc[key].findIndex(
          (o: any) =>
            o.type === 'chat:response' &&
            (o as any).streamingId === (item as any).streamingId,
        );
        if (idx >= 0) acc[key][idx] = item;
        else acc[key].push(item);
      } else {
        acc[key].push(item);
      }

      return acc;
    }, {});
  };

  /**
   * Extrait la réponse finale (chat:response)
   */
  const findChatResponse = (responses: any[] = []) => {
    const output = responses.find(
      (item) => item.ref === 'output' && item.type === 'chat:response',
    );
    return output?.data?.content || output?.content || null;
  };

  const groupedResponses = rawResponse ? groupResponses(rawResponse) : {};
  const chatResponse = rawResponse ? findChatResponse(rawResponse) : null;

  const formatContent = (value: any) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if ('content' in value && typeof value.content === 'string')
        return value.content;
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  /* ------------------------------------------------------------------
   * Render
   * ----------------------------------------------------------------*/
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar assistant */}
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-100 text-blue-600">
            AI
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message card */}
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-2'}`}>
        <Card className={`${isUser ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={isUser ? 'secondary' : 'default'}>
                  {isUser ? 'You' : 'Assistant'}
                </Badge>
                <span className="text-xs opacity-70">
                  {formatTimestamp(timestamp)}
                </span>
                {isStreaming && (
                  <Badge variant="outline" className="animate-pulse">
                    Streaming...
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-6 w-6 p-0"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-2">
              {/* Message principal / streaming */}
              {isUser ? (
                <div className="whitespace-pre-wrap text-lg">{content}</div>
              ) : (
                <div className="whitespace-pre-wrap text-lg">
                  {chatResponse || content}
                  {isStreaming && (
                    <span className="ml-1 inline-block animate-pulse">▌</span>
                  )}
                </div>
              )}

              {/* Details section */}
              {rawResponse && rawResponse.length > 0 && (
                <div className="border-t border-muted pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails((p) => !p)}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    {showDetails ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Masquer les détails
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Afficher les détails
                      </>
                    )}
                  </Button>

                  {showDetails && (
                    <Tabs
                      value={selectedTab}
                      onValueChange={setSelectedTab}
                      className="mt-4 w-full"
                    >
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="thought" className="gap-1">
                          <Brain className="h-4 w-4" />
                          <span className="hidden sm:inline">Pensée</span>
                        </TabsTrigger>
                        <TabsTrigger value="action" className="gap-1">
                          <Cog className="h-4 w-4" />
                          <span className="hidden sm:inline">Action</span>
                        </TabsTrigger>
                        <TabsTrigger value="output" className="gap-1">
                          <FileText className="h-4 w-4" />
                          <span className="hidden sm:inline">Sortie</span>
                        </TabsTrigger>
                        <TabsTrigger value="raw" className="gap-1">
                          <CodeIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Brut</span>
                        </TabsTrigger>
                      </TabsList>

                      {/* Thoughts */}
                      <TabsContent value="thought" className="mt-2">
                        <div className="max-h-80 overflow-y-auto rounded bg-muted/30 p-3">
                          {groupedResponses['thought']?.length ? (
                            groupedResponses['thought'].map((item: any) => (
                              <pre
                                key={item.id}
                                className="mb-2 whitespace-pre-wrap break-words text-xs"
                              >
                                {formatContent(item.content)}
                              </pre>
                            ))
                          ) : (
                            <div className="text-xs italic text-muted-foreground">
                              Aucune pensée disponible
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Actions + Results */}
                      <TabsContent value="action" className="mt-2">
                        <div className="max-h-80 overflow-y-auto rounded bg-muted/30 p-3">
                          {[
                            ...(groupedResponses['call'] || []),
                            ...(groupedResponses['result'] || []),
                          ].length ? (
                            [
                              ...(groupedResponses['call'] || []),
                              ...(groupedResponses['result'] || []),
                            ].map((item: any, idx: number) => (
                              <div key={`${item.ref}-${idx}`} className="mb-2">
                                <div className="mb-1 text-xs font-medium">
                                  {item.ref === 'call'
                                    ? '🔧 Action'
                                    : '📦 Résultat'}
                                </div>
                                <pre className="whitespace-pre-wrap break-words text-xs">
                                  {formatContent(item.data || item.response)}
                                </pre>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs italic text-muted-foreground">
                              Aucune action exécutée
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Output */}
                      <TabsContent value="output" className="mt-2">
                        <div className="max-h-80 overflow-y-auto rounded bg-muted/30 p-3">
                          {groupedResponses['output']?.length ? (
                            groupedResponses['output'].map(
                              (item: any, idx: number) => (
                                <div key={`output-${idx}`} className="mb-2">
                                  <div className="mb-1 text-xs font-medium">
                                    {item.type}
                                  </div>
                                  <pre className="whitespace-pre-wrap break-words text-xs">
                                    {formatContent(
                                      item.data?.content || item.content,
                                    )}
                                  </pre>
                                </div>
                              ),
                            )
                          ) : (
                            <div className="text-xs italic text-muted-foreground">
                              Aucune sortie disponible
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Raw */}
                      <TabsContent value="raw" className="mt-2">
                        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/30 p-3 text-xs">
                          {JSON.stringify(rawResponse, null, 2)}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avatar user */}
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gray-100 text-gray-600">
            U
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

import { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageDetailsProps {
  rawResponse: any[];
  className?: string;
}

export function MessageDetails({
  rawResponse,
  className = '',
}: MessageDetailsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debug log
  console.log('MessageDetails render:', {
    rawResponse,
    isArray: Array.isArray(rawResponse),
    length: rawResponse?.length,
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (data: any, id: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderValue = (value: any, depth = 0): React.JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">null</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className="text-blue-600 dark:text-blue-400">
          {value.toString()}
        </span>
      );
    }

    if (typeof value === 'number') {
      return (
        <span className="text-green-600 dark:text-green-400">{value}</span>
      );
    }

    if (typeof value === 'string') {
      // For very long strings, show in a scrollable area
      if (value.length > 500) {
        return (
          <div className="text-gray-700 dark:text-gray-300">
            <div className="max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs">
              <pre className="whitespace-pre-wrap break-words">{value}</pre>
            </div>
            <Badge variant="outline" className="mt-1 text-xs">
              {value.length} chars
            </Badge>
          </div>
        );
      }
      return (
        <span className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          "{value}"
        </span>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>;
      }
      return (
        <div className="ml-4">
          <span className="text-muted-foreground">[{value.length} items]</span>
          {depth < 3 &&
            value.slice(0, 5).map((item, index) => (
              <div key={index} className="mt-1">
                <span className="text-muted-foreground mr-2">{index}:</span>
                {renderValue(item, depth + 1)}
              </div>
            ))}
          {value.length > 5 && (
            <div className="text-muted-foreground mt-1">
              ... and {value.length - 5} more
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>;
      }

      // For large objects, show in a more compact format
      if (keys.length > 20 || depth > 2) {
        return (
          <div className="ml-4">
            <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs">
              <pre>{JSON.stringify(value, null, 2)}</pre>
            </div>
            <Badge variant="outline" className="mt-1 text-xs">
              {keys.length} properties
            </Badge>
          </div>
        );
      }

      return (
        <div className="ml-4">
          {keys.slice(0, 10).map((key) => (
            <div key={key} className="mt-1">
              <span className="text-purple-600 dark:text-purple-400">
                {key}:
              </span>
              <span className="ml-2">{renderValue(value[key], depth + 1)}</span>
            </div>
          ))}
          {keys.length > 10 && (
            <div className="text-muted-foreground mt-1">
              ... and {keys.length - 10} more properties
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-500">{String(value)}</span>;
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'action_call':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'action_result':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'thought':
      case 'thinking':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'log_stream':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'chat:response':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (!rawResponse || rawResponse.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-muted-foreground mb-2">
        Message Details ({rawResponse.length} events)
      </div>
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2 pr-2">
          {rawResponse.map((item, index) => {
            const itemId = `${index}-${item.type || 'unknown'}`;
            const isExpanded = expandedItems.has(itemId);
            const itemType = item.type || item.ref || 'unknown';

            return (
              <div
                key={itemId}
                className="border rounded-lg p-2 bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpanded(itemId)}
                    className="flex items-center gap-2 text-left flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${getItemTypeColor(itemType)}`}
                    >
                      {itemType}
                    </Badge>
                    {item.data?.name && (
                      <span className="text-sm font-medium">
                        {item.data.name}
                      </span>
                    )}
                    {item.data?.streamingId && (
                      <Badge variant="outline" className="text-xs">
                        {item.data.streamingId}
                      </Badge>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(item, itemId)}
                    className="h-6 w-6 p-0"
                  >
                    {copiedId === itemId ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="mt-2 pl-6 text-sm">
                    <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3 rounded">
                      {renderValue(item)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

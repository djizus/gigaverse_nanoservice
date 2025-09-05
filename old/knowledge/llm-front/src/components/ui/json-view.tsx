import React from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './collapsible';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface JsonViewProps {
  data: any;
  level?: number;
}

const JsonView: React.FC<JsonViewProps> = ({ data, level = 0 }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  if (data === null) return <span className="text-muted-foreground">null</span>;
  if (typeof data !== 'object') {
    return (
      <span
        className={
          typeof data === 'string' ? 'text-green-500' : 'text-blue-500'
        }
      >
        {JSON.stringify(data)}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return <span>{isArray ? '[]' : '{}'}</span>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center">
        <CollapsibleTrigger className="hover:bg-accent rounded p-1">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <span>{isArray ? '[' : '{'}</span>
      </div>

      <CollapsibleContent>
        <div className="ml-4 border-l pl-2 my-1">
          {Object.entries(data).map(([key, value], index) => (
            <div key={key} className="flex">
              <span className="text-purple-500">
                {!isArray ? `"${key}"` : ''}
                {!isArray ? ': ' : ''}
              </span>
              <JsonView data={value} level={level + 1} />
              {index < Object.entries(data).length - 1 && <span>,</span>}
            </div>
          ))}
        </div>
      </CollapsibleContent>
      <span>{isArray ? ']' : '}'}</span>
    </Collapsible>
  );
};

export { JsonView };

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionProps {
  items: Array<{
    value: string;
    title: React.ReactNode;
    content: React.ReactNode;
  }>;
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  className?: string;
}

export function Accordion({
  items,
  type = 'single',
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (value: string) => {
    if (type === 'single') {
      setOpenItems(openItems.includes(value) ? [] : [value]);
    } else {
      setOpenItems(
        openItems.includes(value)
          ? openItems.filter((item) => item !== value)
          : [...openItems, value],
      );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <div key={item.value} className="border rounded-lg">
          <button
            className="flex w-full items-center justify-between p-4 text-left font-medium transition-all hover:underline"
            onClick={() => toggleItem(item.value)}
          >
            {item.title}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                openItems.includes(item.value) && 'transform rotate-180',
              )}
            />
          </button>
          {openItems.includes(item.value) && (
            <div className="p-4 pt-0">{item.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}

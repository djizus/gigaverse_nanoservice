import { useTheme, type Theme } from './theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette, Check } from 'lucide-react';

const themeConfig: Record<Theme, { name: string; description: string; colors: string[] }> = {
  dark: {
    name: 'Dark',
    description: 'Default dark theme',
    colors: ['#020817', '#0f172a', '#3b82f6', '#64748b'],
  },
  light: {
    name: 'Light',
    description: 'Clean light theme',
    colors: ['#ffffff', '#f8fafc', '#3b82f6', '#64748b'],
  },
  system: {
    name: 'System',
    description: 'Follow system preference',
    colors: ['#020817', '#ffffff', '#3b82f6', '#64748b'],
  },
  modern: {
    name: 'Modern',
    description: 'Clean purple minimal',
    colors: ['#faf9fb', '#ffffff', '#a855f7', '#e5e7eb'],
  },
  vintage: {
    name: 'Vintage',
    description: 'Warm retro aesthetic',
    colors: ['#f5f3f0', '#ebe5dd', '#fb923c', '#d6cfc4'],
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Dark cyan neon',
    colors: ['#0a0e1a', '#111927', '#00ffff', '#1e293b'],
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep sea tranquility',
    colors: ['#0c1824', '#141f2e', '#06b6d4', '#334155'],
  },
  forest: {
    name: 'Forest',
    description: 'Natural earth tones',
    colors: ['#0f1410', '#161a17', '#22c55e', '#1e2420'],
  },
};

export function ThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {availableThemes.map((themeOption) => {
          const config = themeConfig[themeOption];
          return (
            <DropdownMenuItem
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              className="flex flex-col items-start gap-2 p-3 cursor-pointer"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{config.name}</span>
                  {theme === themeOption && <Check className="h-4 w-4" />}
                </div>
                <div className="flex gap-1">
                  {config.colors.map((color, index) => (
                    <div
                      key={index}
                      className="h-4 w-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{config.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
/**
 * Theme selector component
 *
 * Handles theme switching between system, light, and dark modes.
 */

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '../../hooks/useTheme';

/**
 * Theme button configuration
 */
const THEMES: { type: Theme; label: string; icon: typeof Sun }[] = [
  { type: 'system', label: 'System', icon: Monitor },
  { type: 'light', label: 'Light', icon: Sun },
  { type: 'dark', label: 'Dark', icon: Moon },
];

/**
 * Theme selection UI component
 */
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="border-t pt-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium">Appearance</label>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setTheme(type)}
              className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors ${
                theme === type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-secondary border-border'
              }`}
              aria-label={`Use ${type} theme`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          System follows your device&apos;s color scheme preference.
        </p>
      </div>
    </div>
  );
}

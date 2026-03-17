/**
 * Provider selection component for AI provider switching
 */

import type { AIProviderType } from '../../services/ai';
import type { ProviderSelectorProps } from './types';

/**
 * Provider button configuration
 */
const PROVIDERS: { type: AIProviderType; label: string }[] = [
  { type: 'anthropic', label: 'Claude (Anthropic)' },
  { type: 'openai', label: 'GPT-4 (OpenAI)' },
  { type: 'gemini', label: 'Gemini (Google)' },
  { type: 'ollama', label: 'Ollama (Local)' },
];

/**
 * Provider selection UI component
 *
 * Displays a grid of buttons for selecting the AI provider
 */
export function ProviderSelector({ provider, onProviderChange }: ProviderSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">AI Provider</label>
      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => onProviderChange(type)}
            className={`px-3 py-2 text-sm rounded-md border transition-colors ${
              provider === type
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-secondary border-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

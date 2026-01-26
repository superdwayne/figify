/**
 * Component specifications index
 *
 * Exports all Shadcn component specs as a unified map for easy lookup.
 */

import type { ComponentSpecMap } from '../types';
import { BUTTON_SPEC } from './button';
import { CARD_SPEC } from './card';
import { BADGE_SPEC } from './badge';
import { INPUT_SPEC } from './input';

/**
 * Map of Shadcn component types to their visual specifications.
 *
 * Usage:
 *   const spec = COMPONENT_SPECS.Button;
 *   if (spec) {
 *     const variant = spec.variants[element.variant || spec.defaultVariant];
 *   }
 */
export const COMPONENT_SPECS: ComponentSpecMap = {
  Button: BUTTON_SPEC,
  Card: CARD_SPEC,
  Badge: BADGE_SPEC,
  Input: INPUT_SPEC,
};

// Re-export individual specs for direct import
export { BUTTON_SPEC } from './button';
export { CARD_SPEC } from './card';
export { BADGE_SPEC } from './badge';
export { INPUT_SPEC } from './input';

/**
 * Component specifications index
 *
 * Exports all Shadcn component specs as a unified map for easy lookup.
 */

import type { ComponentSpecMap } from '../types';

// Core components
import { BUTTON_SPEC } from './button';
import { CARD_SPEC } from './card';
import { BADGE_SPEC } from './badge';
import { INPUT_SPEC } from './input';

// Form components
import { CHECKBOX_SPEC } from './checkbox';
import { SELECT_SPEC } from './select';
import { SWITCH_SPEC } from './switch';
import { RADIO_GROUP_SPEC } from './radioGroup';
import { TOGGLE_SPEC } from './toggle';
import { TOGGLE_GROUP_SPEC } from './toggleGroup';
import { SLIDER_SPEC } from './slider';
import { TEXTAREA_SPEC } from './textarea';
import { LABEL_SPEC } from './label';

// Feedback components
import { ALERT_SPEC } from './alert';
import { DIALOG_SPEC } from './dialog';
import { ALERT_DIALOG_SPEC } from './alertDialog';
import { TOAST_SPEC } from './toast';
import { PROGRESS_SPEC } from './progress';
import { SKELETON_SPEC } from './skeleton';
import { TOOLTIP_SPEC } from './tooltip';

// Navigation components
import { TABS_SPEC } from './tabs';
import { BREADCRUMB_SPEC } from './breadcrumb';
import { PAGINATION_SPEC } from './pagination';
import { NAVIGATION_MENU_SPEC } from './navigationMenu';
import { MENUBAR_SPEC } from './menubar';
import { SIDEBAR_SPEC } from './sidebar';

// Overlay components
import { POPOVER_SPEC } from './popover';
import { HOVER_CARD_SPEC } from './hoverCard';
import { SHEET_SPEC } from './sheet';
import { DRAWER_SPEC } from './drawer';
import { DROPDOWN_MENU_SPEC } from './dropdownMenu';
import { CONTEXT_MENU_SPEC } from './contextMenu';
import { COMMAND_SPEC } from './command';

// Display components
import { AVATAR_SPEC } from './avatar';
import { CALENDAR_SPEC } from './calendar';
import { CAROUSEL_SPEC } from './carousel';
import { TABLE_SPEC } from './table';
import { SCROLL_AREA_SPEC } from './scrollArea';
import { SEPARATOR_SPEC } from './separator';

// Utility components
import { ACCORDION_SPEC } from './accordion';
import { COLLAPSIBLE_SPEC } from './collapsible';

// Typography
import { TYPOGRAPHY_SPEC } from './typography';

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
  // Core
  Button: BUTTON_SPEC,
  Card: CARD_SPEC,
  Badge: BADGE_SPEC,
  Input: INPUT_SPEC,

  // Form
  Checkbox: CHECKBOX_SPEC,
  Select: SELECT_SPEC,
  Switch: SWITCH_SPEC,
  RadioGroup: RADIO_GROUP_SPEC,
  Toggle: TOGGLE_SPEC,
  ToggleGroup: TOGGLE_GROUP_SPEC,
  Slider: SLIDER_SPEC,
  Textarea: TEXTAREA_SPEC,
  Label: LABEL_SPEC,

  // Feedback
  Alert: ALERT_SPEC,
  Dialog: DIALOG_SPEC,
  AlertDialog: ALERT_DIALOG_SPEC,
  Toast: TOAST_SPEC,
  Progress: PROGRESS_SPEC,
  Skeleton: SKELETON_SPEC,
  Tooltip: TOOLTIP_SPEC,

  // Navigation
  Tabs: TABS_SPEC,
  Breadcrumb: BREADCRUMB_SPEC,
  Pagination: PAGINATION_SPEC,
  NavigationMenu: NAVIGATION_MENU_SPEC,
  Menubar: MENUBAR_SPEC,
  Sidebar: SIDEBAR_SPEC,

  // Overlay
  Popover: POPOVER_SPEC,
  HoverCard: HOVER_CARD_SPEC,
  Sheet: SHEET_SPEC,
  Drawer: DRAWER_SPEC,
  DropdownMenu: DROPDOWN_MENU_SPEC,
  ContextMenu: CONTEXT_MENU_SPEC,
  Command: COMMAND_SPEC,

  // Display
  Avatar: AVATAR_SPEC,
  Calendar: CALENDAR_SPEC,
  Carousel: CAROUSEL_SPEC,
  Table: TABLE_SPEC,
  ScrollArea: SCROLL_AREA_SPEC,
  Separator: SEPARATOR_SPEC,

  // Utility
  Accordion: ACCORDION_SPEC,
  Collapsible: COLLAPSIBLE_SPEC,

  // Typography
  Typography: TYPOGRAPHY_SPEC,
};

// Re-export individual specs for direct import
// Core
export { BUTTON_SPEC } from './button';
export { CARD_SPEC } from './card';
export { BADGE_SPEC } from './badge';
export { INPUT_SPEC } from './input';

// Form
export { CHECKBOX_SPEC } from './checkbox';
export { SELECT_SPEC } from './select';
export { SWITCH_SPEC } from './switch';
export { RADIO_GROUP_SPEC } from './radioGroup';
export { TOGGLE_SPEC } from './toggle';
export { TOGGLE_GROUP_SPEC } from './toggleGroup';
export { SLIDER_SPEC } from './slider';
export { TEXTAREA_SPEC } from './textarea';
export { LABEL_SPEC } from './label';

// Feedback
export { ALERT_SPEC } from './alert';
export { DIALOG_SPEC } from './dialog';
export { ALERT_DIALOG_SPEC } from './alertDialog';
export { TOAST_SPEC } from './toast';
export { PROGRESS_SPEC } from './progress';
export { SKELETON_SPEC } from './skeleton';
export { TOOLTIP_SPEC } from './tooltip';

// Navigation
export { TABS_SPEC } from './tabs';
export { BREADCRUMB_SPEC } from './breadcrumb';
export { PAGINATION_SPEC } from './pagination';
export { NAVIGATION_MENU_SPEC } from './navigationMenu';
export { MENUBAR_SPEC } from './menubar';
export { SIDEBAR_SPEC } from './sidebar';

// Overlay
export { POPOVER_SPEC } from './popover';
export { HOVER_CARD_SPEC } from './hoverCard';
export { SHEET_SPEC } from './sheet';
export { DRAWER_SPEC } from './drawer';
export { DROPDOWN_MENU_SPEC } from './dropdownMenu';
export { CONTEXT_MENU_SPEC } from './contextMenu';
export { COMMAND_SPEC } from './command';

// Display
export { AVATAR_SPEC } from './avatar';
export { CALENDAR_SPEC } from './calendar';
export { CAROUSEL_SPEC } from './carousel';
export { TABLE_SPEC } from './table';
export { SCROLL_AREA_SPEC } from './scrollArea';
export { SEPARATOR_SPEC } from './separator';

// Utility
export { ACCORDION_SPEC } from './accordion';
export { COLLAPSIBLE_SPEC } from './collapsible';

// Typography
export { TYPOGRAPHY_SPEC } from './typography';

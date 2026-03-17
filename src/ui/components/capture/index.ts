/**
 * Image capture sub-components
 *
 * These components are used by ImageCapture to handle:
 * - Drag/drop and paste handling (DropZone)
 * - Image display with file info (ImagePreview)
 * - Analyze button and controls (AnalysisControls)
 * - Large image warnings (SizeWarningDialog)
 */

export { DropZone, DropZoneEmptyState } from './DropZone';
export type { DropZoneProps, DropZoneEmptyStateProps } from './DropZone';

export { ImagePreview } from './ImagePreview';
export type { ImagePreviewProps, ImageDimensions } from './ImagePreview';

export { AnalysisControls } from './AnalysisControls';
export type { AnalysisControlsProps } from './AnalysisControls';

export { SizeWarningDialog } from './SizeWarningDialog';
export type { SizeWarningDialogProps } from './SizeWarningDialog';

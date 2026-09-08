export type BeadSize = '2.6mm' | '5.0mm';

export interface BeadColor {
  id: string;
  code: string;       // 如 A01, M05, P01
  name: string;       // 如 纯白, 曜石黑, 樱花粉
  hex: string;        // #FFFFFF
  rgb: [number, number, number];
  lab: [number, number, number];
  brand?: string;
}

export type BackgroundMode = 'transparent' | 'keep' | 'solid';

export interface BeadProject {
  id: string;
  name: string;
  sourceImageData?: string; // base64 / blob URL
  width: number;           // 网格列数，默认 29
  height: number;          // 网格行数，默认 29
  beadSize: BeadSize;      // 2.6mm 或 5.0mm
  paletteId: string;       // 默认 'standard-48'
  backgroundMode: BackgroundMode;
  backgroundColor?: string;
  // 一维网格数组，长度为 width * height。
  // -1 表示透明/空格，>= 0 表示在 palette 中的颜色索引
  cells: number[];
  createdAt: string;
  updatedAt: string;
}

export type EditorTool = 'brush' | 'eraser' | 'picker' | 'fill';

export type CanvasViewMode = 'bead' | 'grid' | 'pixel';

export type GenerationPreset = 'detail' | 'easy' | 'retro';

export interface GenerationOptions {
  width: number;
  height: number;
  maxColors: number;
  preset: GenerationPreset;
  beadSize: BeadSize;
  dithering: boolean;
  fitMode?: 'contain' | 'cover';
  contrastBoost?: number;
}

export interface BeadCountItem {
  colorIndex: number;
  color: BeadColor;
  count: number;
  percentage: number;
}

export interface UsabilityIssue {
  type: 'island' | 'too_many_colors' | 'low_contrast';
  title: string;
  description: string;
  count?: number;
  cells?: number[]; // cell indices
}

import { create } from 'zustand';
import {
  BeadColor,
  BeadProject,
  BeadSize,
  CanvasViewMode,
  EditorTool,
  BeadCountItem,
  WorkspaceMode,
  GenerationOptions,
} from '../lib/types';
import { STANDARD_PALETTE } from '../lib/palette/standardPalette';
import { db } from '../lib/db/database';

const DEFAULT_WIDTH = 29;
const DEFAULT_HEIGHT = 29;

interface EditorState {
  project: BeadProject;
  palette: BeadColor[];
  activeTool: EditorTool;
  activeColorIndex: number;
  viewMode: CanvasViewMode;
  showGrid: boolean;
  showLabels: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
  highlightColorIndex: number | null;
  highlightCells: number[];

  // 工作台模式与生成源数据
  workspaceMode: WorkspaceMode;
  sourceImage: string | null;
  sourceNaturalSize: { width: number; height: number } | null;
  generationOptions: GenerationOptions;

  // 历史栈
  history: number[][];
  redoStack: number[][];

  // 操作
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setSourceImage: (src: string | null, naturalSize?: { width: number; height: number } | null) => void;
  updateGenerationOptions: (patch: Partial<GenerationOptions>) => void;

  setActiveTool: (tool: EditorTool) => void;
  setActiveColorIndex: (index: number) => void;
  setViewMode: (mode: CanvasViewMode) => void;
  setShowGrid: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;
  setOffset: (offsetX: number, offsetY: number) => void;
  setHighlightColorIndex: (index: number | null) => void;
  setHighlightCells: (cells: number[]) => void;

  setCell: (cellIndex: number, colorIndex: number) => void;
  setCellsBatch: (
    updates: { index: number; colorIndex: number }[],
    recordHistory?: boolean
  ) => void;
  floodFill: (startIndex: number, newColorIndex: number) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;

  setBeadSize: (size: BeadSize) => void;
  resizeGrid: (newWidth: number, newHeight: number) => void;
  setProjectName: (name: string) => void;
  loadProject: (project: BeadProject) => void;
  applyGeneratedCells: (cells: number[], width: number, height: number) => void;

  // 统计计算
  getBeadCounts: () => { items: BeadCountItem[]; totalCount: number };
  findIslandCells: () => number[];
  saveToDb: () => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: {
    id: 'draft-1',
    name: '我的拼豆作品',
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    beadSize: '2.6mm',
    paletteId: 'standard-48',
    backgroundMode: 'transparent',
    cells: new Array(DEFAULT_WIDTH * DEFAULT_HEIGHT).fill(-1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  palette: STANDARD_PALETTE,
  activeTool: 'brush',
  activeColorIndex: 1, // 默认黑色
  viewMode: 'bead',
  showGrid: true,
  showLabels: true,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  highlightColorIndex: null,
  highlightCells: [],

  // 工作台模式与生成源数据初始状态
  workspaceMode: 'generate',
  sourceImage: null,
  sourceNaturalSize: null,
  generationOptions: {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    maxColors: 24,
    preset: 'detail',
    beadSize: '2.6mm',
    dithering: true,
    fitMode: 'contain',
    padding: 1,
    removeBackground: false,
    mergeLowUsageColors: false,
    cleanSmallRegions: false,
  },

  history: [],
  redoStack: [],

  setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
  setSourceImage: (src, naturalSize = null) =>
    set({ sourceImage: src, sourceNaturalSize: naturalSize }),
  updateGenerationOptions: (patch) =>
    set((state) => ({
      generationOptions: { ...state.generationOptions, ...patch },
    })),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColorIndex: (index) => set({ activeColorIndex: index }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowGrid: (show) => set({ showGrid: show }),
  setShowLabels: (show) => set({ showLabels: show }),
  setScale: (scaleOrUpdater) =>
    set((state) => ({
      scale: typeof scaleOrUpdater === 'function' ? scaleOrUpdater(state.scale) : scaleOrUpdater,
    })),
  setOffset: (offsetX, offsetY) => set({ offsetX, offsetY }),
  setHighlightColorIndex: (index) => set({ highlightColorIndex: index }),
  setHighlightCells: (cells) => set({ highlightCells: cells }),

  setCell: (cellIndex, colorIndex) => {
    const { project, history } = get();
    if (cellIndex < 0 || cellIndex >= project.cells.length) return;
    if (project.cells[cellIndex] === colorIndex) return;

    // 存历史
    const newHistory = [...history, [...project.cells]].slice(-30);
    const newCells = [...project.cells];
    newCells[cellIndex] = colorIndex;

    set({
      project: { ...project, cells: newCells, updatedAt: new Date().toISOString() },
      history: newHistory,
      redoStack: [],
    });
  },

  setCellsBatch: (updates, recordHistory = true) => {
    const { project, history } = get();
    if (updates.length === 0) return;

    const newCells = [...project.cells];

    let hasChange = false;
    for (const { index, colorIndex } of updates) {
      if (index >= 0 && index < newCells.length && newCells[index] !== colorIndex) {
        newCells[index] = colorIndex;
        hasChange = true;
      }
    }

    if (!hasChange) return;

    set({
      project: { ...project, cells: newCells, updatedAt: new Date().toISOString() },
      history: recordHistory ? [...history, [...project.cells]].slice(-30) : history,
      redoStack: recordHistory ? [] : get().redoStack,
    });
  },

  floodFill: (startIndex, newColorIndex) => {
    const { project, history } = get();
    const { width, height, cells } = project;
    if (startIndex < 0 || startIndex >= cells.length) return;

    const oldColorIndex = cells[startIndex];
    if (oldColorIndex === newColorIndex) return;

    const newHistory = [...history, [...cells]].slice(-30);
    const nextCells = [...cells];

    // 广度优先搜索 (BFS) 洪水填充
    const queue: number[] = [startIndex];
    const visited = new Uint8Array(width * height);
    visited[startIndex] = 1;

    while (queue.length > 0) {
      const curr = queue.pop()!;
      nextCells[curr] = newColorIndex;

      const currX = curr % width;
      const currY = Math.floor(curr / width);

      // 左
      if (currX > 0) {
        const left = curr - 1;
        if (!visited[left] && nextCells[left] === oldColorIndex) {
          visited[left] = 1;
          queue.push(left);
        }
      }
      // 右
      if (currX < width - 1) {
        const right = curr + 1;
        if (!visited[right] && nextCells[right] === oldColorIndex) {
          visited[right] = 1;
          queue.push(right);
        }
      }
      // 上
      if (currY > 0) {
        const top = curr - width;
        if (!visited[top] && nextCells[top] === oldColorIndex) {
          visited[top] = 1;
          queue.push(top);
        }
      }
      // 下
      if (currY < height - 1) {
        const bottom = curr + width;
        if (!visited[bottom] && nextCells[bottom] === oldColorIndex) {
          visited[bottom] = 1;
          queue.push(bottom);
        }
      }
    }

    set({
      project: { ...project, cells: nextCells, updatedAt: new Date().toISOString() },
      history: newHistory,
      redoStack: [],
    });
  },

  clearCanvas: () => {
    const { project, history } = get();
    const newHistory = [...history, [...project.cells]].slice(-30);
    set({
      project: {
        ...project,
        cells: new Array(project.width * project.height).fill(-1),
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      redoStack: [],
    });
  },

  undo: () => {
    const { history, project, redoStack } = get();
    if (history.length === 0) return;

    const previousCells = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newRedo = [...redoStack, [...project.cells]];

    set({
      project: { ...project, cells: previousCells, updatedAt: new Date().toISOString() },
      history: newHistory,
      redoStack: newRedo,
    });
  },

  redo: () => {
    const { redoStack, project, history } = get();
    if (redoStack.length === 0) return;

    const nextCells = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newHistory = [...history, [...project.cells]];

    set({
      project: { ...project, cells: nextCells, updatedAt: new Date().toISOString() },
      history: newHistory,
      redoStack: newRedo,
    });
  },

  setBeadSize: (size) =>
    set((state) => ({
      project: { ...state.project, beadSize: size, updatedAt: new Date().toISOString() },
    })),

  resizeGrid: (newWidth, newHeight) => {
    const { project, history } = get();
    const oldWidth = project.width;
    const oldHeight = project.height;
    const oldCells = project.cells;

    const newHistory = [...history, [...oldCells]].slice(-30);
    const newCells = new Array(newWidth * newHeight).fill(-1);

    const copyW = Math.min(oldWidth, newWidth);
    const copyH = Math.min(oldHeight, newHeight);

    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        newCells[y * newWidth + x] = oldCells[y * oldWidth + x];
      }
    }

    set({
      project: {
        ...project,
        width: newWidth,
        height: newHeight,
        cells: newCells,
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      redoStack: [],
    });
  },

  setProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name, updatedAt: new Date().toISOString() },
    })),

  loadProject: (loadedProject) =>
    set({
      project: loadedProject,
      history: [],
      redoStack: [],
    }),

  applyGeneratedCells: (cells, width, height) => {
    const { project, history } = get();
    const newHistory = [...history, [...project.cells]].slice(-30);
    set({
      project: {
        ...project,
        width,
        height,
        cells,
        updatedAt: new Date().toISOString(),
      },
      history: newHistory,
      redoStack: [],
    });
  },

  getBeadCounts: () => {
    const { project, palette } = get();
    const counts = new Map<number, number>();
    let totalCount = 0;

    for (const c of project.cells) {
      if (c >= 0 && c < palette.length) {
        counts.set(c, (counts.get(c) || 0) + 1);
        totalCount++;
      }
    }

    const items: BeadCountItem[] = Array.from(counts.entries())
      .map(([colorIdx, count]) => ({
        colorIndex: colorIdx,
        color: palette[colorIdx],
        count,
        percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return { items, totalCount };
  },

  findIslandCells: () => {
    const { project } = get();
    const { width, height, cells } = project;
    const islands: number[] = [];
    const neighbors = [-1, 1, -width, width];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const current = cells[idx];
        if (current === -1) continue;

        let hasNeighbor = false;
        for (const offset of neighbors) {
          const nIdx = idx + offset;
          const nx = nIdx % width;
          const ny = Math.floor(nIdx / width);
          if (Math.abs(nx - x) + Math.abs(ny - y) === 1) {
            if (cells[nIdx] === current) {
              hasNeighbor = true;
              break;
            }
          }
        }
        if (!hasNeighbor) {
          islands.push(idx);
        }
      }
    }

    return islands;
  },

  saveToDb: async () => {
    const { project } = get();
    await db.projects.put({
      ...project,
      updatedAt: new Date().toISOString(),
    });
  },
}));

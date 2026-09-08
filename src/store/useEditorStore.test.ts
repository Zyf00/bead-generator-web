import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './useEditorStore';
import type { BeadProject } from '../lib/types';

function createProject(width = 3, height = 3): BeadProject {
  return {
    id: 'test-project',
    name: '测试工程',
    width,
    height,
    beadSize: '2.6mm',
    paletteId: 'standard-48',
    backgroundMode: 'transparent',
    cells: new Array(width * height).fill(-1),
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
  };
}

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      project: createProject(),
      history: [],
      redoStack: [],
    });
  });

  it('treats a batch update as one undoable action', () => {
    const store = useEditorStore.getState();

    store.setCellsBatch([
      { index: 0, colorIndex: 1 },
    ]);
    store.setCellsBatch([
      { index: 1, colorIndex: 2 },
      { index: 2, colorIndex: 3 },
    ], false);

    expect(useEditorStore.getState().project.cells.slice(0, 3)).toEqual([1, 2, 3]);
    expect(useEditorStore.getState().history).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().project.cells).toEqual(new Array(9).fill(-1));
  });

  it('fills only the connected region with the target color', () => {
    useEditorStore.setState({
      project: {
        ...createProject(),
        cells: [1, 1, 2, 1, 2, 2, 3, 3, 2],
      },
    });

    useEditorStore.getState().floodFill(0, 4);

    expect(useEditorStore.getState().project.cells).toEqual([4, 4, 2, 4, 2, 2, 3, 3, 2]);
  });

  it('preserves the top-left cells when resizing a grid', () => {
    useEditorStore.setState({
      project: {
        ...createProject(2, 2),
        cells: [1, 2, 3, 4],
      },
      history: [],
      redoStack: [],
    });

    useEditorStore.getState().resizeGrid(3, 3);

    expect(useEditorStore.getState().project.cells).toEqual([
      1, 2, -1,
      3, 4, -1,
      -1, -1, -1,
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { parseBeadProjectFile } from './exportProject';

function createProjectFile(project: unknown) {
  return new File([JSON.stringify(project)], 'project.bead', {
    type: 'application/json',
  });
}

describe('parseBeadProjectFile', () => {
  it('rejects a project whose cell count does not match its grid dimensions', async () => {
    const file = createProjectFile({
      id: 'bad-grid',
      name: '损坏工程',
      width: 2,
      height: 2,
      beadSize: '2.6mm',
      paletteId: 'standard-48',
      backgroundMode: 'transparent',
      cells: [0, 1, 2],
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    });

    await expect(parseBeadProjectFile(file)).rejects.toThrow('无效的拼豆工程文件格式');
  });

  it('accepts a complete project with valid grid data', async () => {
    const file = createProjectFile({
      id: 'valid-grid',
      name: '有效工程',
      width: 2,
      height: 2,
      beadSize: '2.6mm',
      paletteId: 'standard-48',
      backgroundMode: 'transparent',
      cells: [0, 1, -1, 2],
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
    });

    await expect(parseBeadProjectFile(file)).resolves.toMatchObject({
      id: 'valid-grid',
      cells: [0, 1, -1, 2],
    });
  });
});

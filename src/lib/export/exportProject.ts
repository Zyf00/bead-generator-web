import { BeadProject } from '../types';

function isValidBeadProject(value: unknown): value is BeadProject {
  if (!value || typeof value !== 'object') return false;

  const project = value as Partial<BeadProject>;
  const { width, height, cells } = project;
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    !Array.isArray(cells) ||
    cells.length !== width * height
  ) {
    return false;
  }

  const hasValidCells = cells.every((cell) => Number.isInteger(cell) && cell >= -1);

  return Boolean(
    hasValidCells &&
      typeof project.id === 'string' &&
      typeof project.name === 'string' &&
      (project.beadSize === '2.6mm' || project.beadSize === '5.0mm') &&
      typeof project.paletteId === 'string' &&
      ['transparent', 'keep', 'solid'].includes(project.backgroundMode ?? '') &&
      typeof project.createdAt === 'string' &&
      typeof project.updatedAt === 'string'
  );
}

/**
 * 导出工程文件为 .bead (JSON 格式)
 */
export function exportBeadProjectFile(project: BeadProject): void {
  const data = JSON.stringify(project, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${project.name || '拼豆工程'}.bead`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 读取并解析用户导入的 .bead 工程文件
 */
export function parseBeadProjectFile(file: File): Promise<BeadProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const project: unknown = JSON.parse(text);
        if (!isValidBeadProject(project)) {
          throw new Error('无效的拼豆工程文件格式');
        }
        resolve(project);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

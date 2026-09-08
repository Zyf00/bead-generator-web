import { BeadCountItem } from '../types';

export function exportBeadListToCsv(
  projectName: string,
  items: BeadCountItem[],
  totalCount: number
): void {
  const headers = ['色号', '颜色名称', 'Hex色值', '所需颗数', '占比'];
  const rows = items.map(item => [
    item.color.code,
    item.color.name,
    item.color.hex,
    item.count.toString(),
    `${item.percentage.toFixed(1)}%`,
  ]);

  rows.push(['总计', `${items.length} 种颜色`, '-', totalCount.toString(), '100%']);

  // 加 BOM 防止 Excel 打开乱码
  const csvContent =
    '\uFEFF' +
    [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName || '拼豆作品'}_材料清单.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

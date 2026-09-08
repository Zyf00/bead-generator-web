import { BeadColor } from '../types';

/**
 * 导出成品预览图 PNG
 */
export function exportFinishedImage(
  cells: number[],
  width: number,
  height: number,
  palette: BeadColor[],
  projectName: string,
  cellSize: number = 32
): void {
  const canvas = document.createElement('canvas');
  canvas.width = width * cellSize;
  canvas.height = height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 绘制透明背景或白底
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const radius = (cellSize / 2) * 0.9;
  const holeRadius = radius * 0.35;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const colorIdx = cells[idx];
      if (colorIdx === -1 || colorIdx === undefined) continue;

      const color = palette[colorIdx];
      if (!color) continue;
      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;

      // 绘制拼豆颗粒圆球
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color.hex;
      ctx.fill();

      // 微微内阴影/高光增加质感
      ctx.beginPath();
      ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fill();

      // 中心小孔
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fill();
    }
  }

  const link = document.createElement('a');
  link.download = `${projectName || '拼豆作品'}_成品预览.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * 导出带网格标尺与色号的制作图纸 PNG
 */
export function exportPatternSheetImage(
  cells: number[],
  width: number,
  height: number,
  palette: BeadColor[],
  projectName: string,
  cellSize: number = 44
): void {
  const rulerSize = 36;
  const canvas = document.createElement('canvas');
  canvas.width = width * cellSize + rulerSize;
  canvas.height = height * cellSize + rulerSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 标尺背景
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, canvas.width, rulerSize);
  ctx.fillRect(0, 0, rulerSize, canvas.height);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 横向标尺
  for (let x = 0; x < width; x++) {
    const rx = rulerSize + x * cellSize + cellSize / 2;
    ctx.fillText(`${x + 1}`, rx, rulerSize / 2);
  }

  // 纵向标尺
  for (let y = 0; y < height; y++) {
    const ry = rulerSize + y * cellSize + cellSize / 2;
    ctx.fillText(`${y + 1}`, rulerSize / 2, ry);
  }

  // 绘制网格与色号
  const radius = (cellSize / 2) * 0.88;
  const holeRadius = radius * 0.25;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const colorIdx = cells[idx];
      const cx = rulerSize + x * cellSize + cellSize / 2;
      const cy = rulerSize + y * cellSize + cellSize / 2;

      // 绘制单元格背景边框
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      ctx.strokeRect(rulerSize + x * cellSize, rulerSize + y * cellSize, cellSize, cellSize);

      if (colorIdx === -1 || colorIdx === undefined) continue;

      const color = palette[colorIdx];
      if (!color) continue;

      // 拼豆圆圈
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color.hex;
      ctx.fill();

      // 小中心孔
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fill();

      // 色号文本 (根据底色亮度选黑/白字)
      const isLight = (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000 > 135;
      ctx.fillStyle = isLight ? '#1F2937' : '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(color.code, cx, cy);
    }
  }

  const link = document.createElement('a');
  link.download = `${projectName || '拼豆作品'}_标号图纸.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

import { PDFDocument } from 'pdf-lib';
import { BeadColor, BeadCountItem, BeadSize } from '../types';

const MM_TO_PT = 2.83464567;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PAGE_MARGIN_MM = 10;

export interface PhysicalPageSegment {
  startX: number;
  startY: number;
  width: number;
  height: number;
}

export function getPhysicalPageSegments(
  width: number,
  height: number,
  beadSize: BeadSize
): PhysicalPageSegment[] {
  const pitchMm = beadSize === '2.6mm' ? 2.6 : 5.0;
  const maxWidthMm = A4_WIDTH_PT / MM_TO_PT - PAGE_MARGIN_MM * 2;
  const maxHeightMm = A4_HEIGHT_PT / MM_TO_PT - PAGE_MARGIN_MM * 2;
  const cellsPerPageWidth = Math.floor(maxWidthMm / pitchMm);
  const cellsPerPageHeight = Math.floor(maxHeightMm / pitchMm);
  const segments: PhysicalPageSegment[] = [];

  for (let startY = 0; startY < height; startY += cellsPerPageHeight) {
    for (let startX = 0; startX < width; startX += cellsPerPageWidth) {
      segments.push({
        startX,
        startY,
        width: Math.min(cellsPerPageWidth, width - startX),
        height: Math.min(cellsPerPageHeight, height - startY),
      });
    }
  }

  return segments;
}

/**
 * 离屏生成用于 PDF 嵌入的高清图纸 Canvas 并返回 PNG Uint8Array
 */
function createSheetCanvasDataUrl(
  cells: number[],
  width: number,
  height: number,
  palette: BeadColor[],
  showCodes: boolean = true,
  segment: PhysicalPageSegment = { startX: 0, startY: 0, width, height }
): string {
  const cellSize = 40;
  const canvas = document.createElement('canvas');
  canvas.width = segment.width * cellSize;
  canvas.height = segment.height * cellSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const radius = (cellSize / 2) * 0.88;
  const holeRadius = radius * 0.25;

  for (let y = 0; y < segment.height; y++) {
    for (let x = 0; x < segment.width; x++) {
      const idx = (segment.startY + y) * width + segment.startX + x;
      const colorIdx = cells[idx];
      const cx = x * cellSize + cellSize / 2;
      const cy = y * cellSize + cellSize / 2;

      // 边框
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

      if (colorIdx === -1 || colorIdx === undefined) continue;
      const color = palette[colorIdx];
      if (!color) continue;

      // 拼豆圆
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color.hex;
      ctx.fill();

      // 中心孔
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fill();

      // 色号文字
      if (showCodes) {
        const isLight = (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000 > 135;
        ctx.fillStyle = isLight ? '#1E293B' : '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(color.code, cx, cy);
      }
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * 离屏生成材料统计清单图片
 */
function createShoppingListCanvasDataUrl(
  items: BeadCountItem[],
  totalCount: number,
  projectName: string,
  width: number,
  height: number,
  beadSize: BeadSize
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = Math.max(600, 160 + items.length * 28 + 40);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 顶部标题
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`拼豆材料清单 - ${projectName || '未命名作品'}`, 40, 50);

  ctx.fillStyle = '#64748B';
  ctx.font = '14px sans-serif';
  const realDim = beadSize === '2.6mm' 
    ? `${(width * 0.26).toFixed(1)} × ${(height * 0.26).toFixed(1)} cm` 
    : `${(width * 0.5).toFixed(1)} × ${(height * 0.5).toFixed(1)} cm`;
  ctx.fillText(
    `图案尺寸: ${width} × ${height} 颗 | 豆子规格: ${beadSize} | 成品预计: ${realDim} | 总用量: ${totalCount} 颗 | 颜色数: ${items.length} 色`,
    40,
    80
  );

  // 表格头
  const startY = 120;
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(40, startY, 720, 32);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('序号', 55, startY + 16);
  ctx.fillText('色号', 110, startY + 16);
  ctx.fillText('色块', 180, startY + 16);
  ctx.fillText('颜色名称', 260, startY + 16);
  ctx.fillText('Hex 色值', 430, startY + 16);
  ctx.fillText('颗数', 580, startY + 16);
  ctx.fillText('占比', 680, startY + 16);

  // 表格行
  ctx.font = '13px sans-serif';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowY = startY + 36 + i * 28;

    if (i % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(40, rowY - 4, 720, 28);
    }

    ctx.fillStyle = '#475569';
    ctx.fillText(`${i + 1}`, 55, rowY + 10);
    ctx.fillText(item.color.code, 110, rowY + 10);

    // 颜色圆形色块
    ctx.beginPath();
    ctx.arc(195, rowY + 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = item.color.hex;
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.fillText(item.color.name, 260, rowY + 10);
    ctx.fillStyle = '#64748B';
    ctx.fillText(item.color.hex, 430, rowY + 10);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${item.count} 颗`, 580, rowY + 10);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`${item.percentage.toFixed(1)}%`, 680, rowY + 10);
  }

  return canvas.toDataURL('image/png');
}

/**
 * 导出 PDF（支持 1:1 实物比例打印图纸与材料清单）
 */
export async function exportToPdf(options: {
  projectName: string;
  cells: number[];
  width: number;
  height: number;
  palette: BeadColor[];
  items: BeadCountItem[];
  totalCount: number;
  beadSize: BeadSize;
  isPhysicalScale: boolean; // 是否按照 1:1 打印
}): Promise<void> {
  const {
    projectName,
    cells,
    width,
    height,
    palette,
    items,
    totalCount,
    beadSize,
    isPhysicalScale,
  } = options;

  const pdfDoc = await PDFDocument.create();

  if (isPhysicalScale) {
    const pitchMm = beadSize === '2.6mm' ? 2.6 : 5.0;
    const marginPt = PAGE_MARGIN_MM * MM_TO_PT;

    for (const segment of getPhysicalPageSegments(width, height, beadSize)) {
      const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      const patternDataUrl = createSheetCanvasDataUrl(cells, width, height, palette, true, segment);
      const patternImageBytes = await fetch(patternDataUrl).then((res) => res.arrayBuffer());
      const patternImage = await pdfDoc.embedPng(patternImageBytes);
      const drawW = segment.width * pitchMm * MM_TO_PT;
      const drawH = segment.height * pitchMm * MM_TO_PT;

      page.drawImage(patternImage, {
        x: marginPt,
        y: A4_HEIGHT_PT - marginPt - drawH,
        width: drawW,
        height: drawH,
      });
    }
  } else {
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    const patternDataUrl = createSheetCanvasDataUrl(cells, width, height, palette, true);
    const patternImageBytes = await fetch(patternDataUrl).then((res) => res.arrayBuffer());
    const patternImage = await pdfDoc.embedPng(patternImageBytes);

    // 自适应填入页面安全区
    const maxSafeW = A4_WIDTH_PT - 80;
    const maxSafeH = A4_HEIGHT_PT - 140;
    const scale = Math.min(maxSafeW / patternImage.width, maxSafeH / patternImage.height, 1);
    const drawW = patternImage.width * scale;
    const drawH = patternImage.height * scale;

    page.drawImage(patternImage, {
      x: (A4_WIDTH_PT - drawW) / 2,
      y: (A4_HEIGHT_PT - drawH) / 2 - 20,
      width: drawW,
      height: drawH,
    });
  }

  // 2. 第二页：材料用量清单表
  const page2 = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  const listDataUrl = createShoppingListCanvasDataUrl(
    items,
    totalCount,
    projectName,
    width,
    height,
    beadSize
  );
  const listImageBytes = await fetch(listDataUrl).then(res => res.arrayBuffer());
  const listImage = await pdfDoc.embedPng(listImageBytes);

  const listScale = Math.min((A4_WIDTH_PT - 60) / listImage.width, (A4_HEIGHT_PT - 60) / listImage.height, 1);
  const lw = listImage.width * listScale;
  const lh = listImage.height * listScale;

  page2.drawImage(listImage, {
    x: (A4_WIDTH_PT - lw) / 2,
    y: A4_HEIGHT_PT - lh - 40,
    width: lw,
    height: lh,
  });

  // 保存并触发下载
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `${projectName || '拼豆作品'}_制作图纸与清单.pdf`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

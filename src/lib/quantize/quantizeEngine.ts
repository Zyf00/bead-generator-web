import { BeadColor, GenerationOptions } from '../types';
import { findClosestColorIndex } from '../palette/colorDistance';

/**
 * 将任意图片渲染并采样成 width × height 网格的 ImageData
 * 支持 contain (等比例居中完整放入，边缘透明) 与 cover (拉伸充满)
 */
export function resampleImageToGrid(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  fitMode: 'contain' | 'cover' = 'cover',
  sourceWidth?: number,
  sourceHeight?: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 上下文');
  }

  // 保证清晰的像素边缘，或者先双线性缩小后提取
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (fitMode === 'contain' && sourceWidth && sourceHeight) {
    // 等比例缩放居中放置，留空区域保持透明 (alpha = 0)
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    const drawX = (targetWidth - drawW) / 2;
    const drawY = (targetHeight - drawH) / 2;
    ctx.drawImage(source, drawX, drawY, drawW, drawH);
  } else {
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  }

  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * 调整像素对比度与饱和度（用于复古像素风）
 */
function applyContrastAndSaturation(
  data: Uint8ClampedArray,
  contrast: number,
  saturation: number
) {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    // 忽略完全透明像素
    if (data[i + 3] < 30) continue;

    // 对比度
    let r = factor * (data[i] - 128) + 128;
    let g = factor * (data[i + 1] - 128) + 128;
    let b = factor * (data[i + 2] - 128) + 128;

    // 饱和度
    const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
    r = gray + (r - gray) * saturation;
    g = gray + (g - gray) * saturation;
    b = gray + (b - gray) * saturation;

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }
}

/**
 * 获取图片中使用频率最高的前 N 种最匹配色卡颜色
 */
function selectTopDominantPalette(
  imageData: ImageData,
  fullPalette: BeadColor[],
  maxColors: number
): { restrictedPalette: BeadColor[]; indexMap: number[] } {
  const data = imageData.data;
  const countMap = new Map<number, number>();

  // 统计每种色卡颜色的初筛频次
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 30) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const bestIdx = findClosestColorIndex([r, g, b], fullPalette);
    countMap.set(bestIdx, (countMap.get(bestIdx) || 0) + 1);
  }

  // 按频次从大到小排序
  const sorted = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
  const chosenIndices = sorted.slice(0, maxColors).map(item => item[0]);

  // 如果提取不到足够颜色（例如纯透明或全白图），保证 indexMap 与 restrictedPalette 长度一致
  if (chosenIndices.length === 0) {
    const fallbackPalette = fullPalette.slice(0, maxColors);
    return { restrictedPalette: fallbackPalette, indexMap: fallbackPalette.map((_, i) => i) };
  }

  const restrictedPalette = chosenIndices.map(idx => fullPalette[idx]);
  return { restrictedPalette, indexMap: chosenIndices };
}

/**
 * 孤岛豆子清理处理（移除或合并四周完全无同色的孤立豆子，适合"容易完成"方案）
 */
function removeSingleIslands(
  cells: number[],
  width: number,
  height: number
): number[] {
  const result = [...cells];
  const neighbors = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const current = result[idx];
      if (current === -1) continue;

      let hasSameNeighbor = false;
      const neighborCounts = new Map<number, number>();

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nVal = result[ny * width + nx];
          if (nVal === current) {
            hasSameNeighbor = true;
            break;
          }
          if (nVal !== -1) {
            neighborCounts.set(nVal, (neighborCounts.get(nVal) || 0) + 1);
          }
        }
      }

      // 如果四周没有任何一个邻居与当前颜色相同，且有优势邻近色，将其合并到最多的邻居色
      if (!hasSameNeighbor && neighborCounts.size > 0) {
        let maxColor = current;
        let maxCount = 0;
        for (const [col, cnt] of Array.from(neighborCounts.entries())) {
          if (cnt > maxCount) {
            maxCount = cnt;
            maxColor = col;
          }
        }
        result[idx] = maxColor;
      }
    }
  }

  return result;
}

/**
 * 核心量化引擎：将源图片按照选项转换为拼豆网格数据
 */
export function quantizeImageToGrid(
  source: CanvasImageSource,
  options: GenerationOptions,
  fullPalette: BeadColor[],
  sourceWidth?: number,
  sourceHeight?: number
): { cells: number[]; usedPaletteIndices: number[] } {
  const { width, height, maxColors, preset, dithering, fitMode = 'cover' } = options;

  // 1. 采样至目标网格尺寸
  const imgData = resampleImageToGrid(source, width, height, fitMode, sourceWidth, sourceHeight);
  const data = imgData.data;

  // 2. 根据不同预设进行图像色彩调优
  if (preset === 'retro') {
    // 复古像素风：提升对比度 +15，饱和度 1.3
    applyContrastAndSaturation(data, 20, 1.35);
  } else if (preset === 'easy') {
    // 容易完成：稍微平滑对比度
    applyContrastAndSaturation(data, -5, 1.0);
  }

  // 3. 筛选主色卡集合
  const targetMaxColors = Math.min(maxColors, fullPalette.length);
  const { restrictedPalette, indexMap } = selectTopDominantPalette(imgData, fullPalette, targetMaxColors);

  // 4. 量化网格匹配（支持 Floyd-Steinberg 误差抖动）
  const cells = new Array<number>(width * height).fill(-1);

  // 浮点色彩缓冲区用于误差扩散
  const bufferR = new Float32Array(width * height);
  const bufferG = new Float32Array(width * height);
  const bufferB = new Float32Array(width * height);
  const alphaBuffer = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    bufferR[i] = data[i * 4];
    bufferG[i] = data[i * 4 + 1];
    bufferB[i] = data[i * 4 + 2];
    alphaBuffer[i] = data[i * 4 + 3];
  }

  const useDithering = dithering && preset === 'detail';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // 透明像素跳过
      if (alphaBuffer[idx] < 30) {
        cells[idx] = -1;
        continue;
      }

      const r = Math.min(255, Math.max(0, bufferR[idx]));
      const g = Math.min(255, Math.max(0, bufferG[idx]));
      const b = Math.min(255, Math.max(0, bufferB[idx]));

      // 找最近色
      const localBestIdx = findClosestColorIndex([r, g, b], restrictedPalette);
      const originalPaletteIndex = indexMap[localBestIdx] ?? 0;
      cells[idx] = originalPaletteIndex;

      // 误差扩散
      if (useDithering) {
        const matchedColor = fullPalette[originalPaletteIndex];
        if (matchedColor) {
          const errR = r - matchedColor.rgb[0];
          const errG = g - matchedColor.rgb[1];
          const errB = b - matchedColor.rgb[2];

          // Floyd-Steinberg 系数:
        // [*,  7/16]
        // [3/16, 5/16, 1/16]
        const distribute = (nx: number, ny: number, factor: number) => {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (alphaBuffer[nIdx] >= 30) {
              bufferR[nIdx] += errR * factor;
              bufferG[nIdx] += errG * factor;
              bufferB[nIdx] += errB * factor;
            }
          }
        };

        distribute(x + 1, y, 7 / 16);
        distribute(x - 1, y + 1, 3 / 16);
        distribute(x, y + 1, 5 / 16);
        distribute(x + 1, y + 1, 1 / 16);
        }
      }
    }
  }

  // 5. 若是“容易完成”预设，执行孤岛合并
  let finalCells = cells;
  if (preset === 'easy') {
    finalCells = removeSingleIslands(cells, width, height);
  }

  // 收集最终实际用到的色卡索引
  const usedSet = new Set<number>();
  for (const c of finalCells) {
    if (c >= 0) usedSet.add(c);
  }

  return {
    cells: finalCells,
    usedPaletteIndices: Array.from(usedSet).sort((a, b) => a - b),
  };
}

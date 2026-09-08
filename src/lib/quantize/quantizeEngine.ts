import { BeadColor, GenerationOptions, GeneratorFitMode } from '../types';
import { findClosestColorIndex, ciede2000 } from '../palette/colorDistance';

/**
 * 将任意图片渲染并采样成 width × height 网格的 ImageData
 * 支持 contain (等比例居中完整放入，边缘透明) 与 cover (拉伸充满) 以及 auto_grid (自适应宽高填充)
 * 支持 padding (网格四周预留留白内边距，边缘保持透明空孔)
 */
export function resampleImageToGrid(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  fitMode: GeneratorFitMode = 'cover',
  sourceWidth?: number,
  sourceHeight?: number,
  padding: number = 0
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

  // 计算扣除留白内边距后的可用网格尺寸
  const safePadding = Math.max(0, Math.min(padding, Math.floor(Math.min(targetWidth, targetHeight) / 4)));
  const availWidth = targetWidth - safePadding * 2;
  const availHeight = targetHeight - safePadding * 2;
  const offsetX = safePadding;
  const offsetY = safePadding;

  if (fitMode === 'contain' && sourceWidth && sourceHeight) {
    // 等比例缩放居中放置，留空区域保持透明 (alpha = 0)
    const scale = Math.min(availWidth / sourceWidth, availHeight / sourceHeight);
    const drawW = sourceWidth * scale;
    const drawH = sourceHeight * scale;
    const drawX = offsetX + (availWidth - drawW) / 2;
    const drawY = offsetY + (availHeight - drawH) / 2;
    ctx.drawImage(source, drawX, drawY, drawW, drawH);
  } else {
    // cover 铺满可用区域
    ctx.drawImage(source, offsetX, offsetY, availWidth, availHeight);
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
 * 智能渐进式调色板合并算法：
 * 避免提前按面积截断色卡造成前景关键色（如黑眼珠、红唇、面部肤色）丢失。
 * 综合评估各颜色之间的 CIEDE2000 感知色差与像素占比，
 * 优先合并视觉极其接近的同类色（如相似渐变背景），保护高反差、强特征的孤立关键色。
 */
export function smartReducePalette(
  cells: number[],
  palette: BeadColor[],
  maxColors: number
): { cells: number[]; usedPaletteIndices: number[] } {
  // 1. 统计当前网格中各色号出现次数
  const countMap = new Map<number, number>();
  for (const c of cells) {
    if (c >= 0) {
      countMap.set(c, (countMap.get(c) || 0) + 1);
    }
  }

  const distinctColors = Array.from(countMap.keys());
  if (distinctColors.length <= maxColors) {
    return {
      cells,
      usedPaletteIndices: distinctColors.sort((a, b) => a - b),
    };
  }

  // 2. 渐进式迭代合并，直至剩余色数 <= maxColors
  const parentMap = new Map<number, number>();
  const getRoot = (color: number): number => {
    let curr = color;
    while (parentMap.has(curr)) {
      curr = parentMap.get(curr)!;
    }
    return curr;
  };

  const activeColors = [...distinctColors];

  while (activeColors.length > maxColors) {
    let minCost = Infinity;
    let bestPair: [number, number] = [activeColors[0], activeColors[1]];

    for (let i = 0; i < activeColors.length; i++) {
      for (let j = i + 1; j < activeColors.length; j++) {
        const c1 = activeColors[i];
        const c2 = activeColors[j];
        const lab1 = palette[c1].lab;
        const lab2 = palette[c2].lab;

        const dE = ciede2000(lab1, lab2);
        const cnt1 = countMap.get(c1) || 1;
        const cnt2 = countMap.get(c2) || 1;

        // 合并成本 = CIEDE2000 感知色差 × 较少一方颗粒数的开方加权
        // 这样色差极小的相似色优先合并，高反差关键特征色得以坚决保留
        const cost = dE * Math.sqrt(Math.min(cnt1, cnt2));
        if (cost < minCost) {
          minCost = cost;
          bestPair = [c1, c2];
        }
      }
    }

    const [c1, c2] = bestPair;
    const cnt1 = countMap.get(c1) || 0;
    const cnt2 = countMap.get(c2) || 0;

    // 频次较少的合并入频次较多的主色
    const [survivor, absorbed] = cnt1 >= cnt2 ? [c1, c2] : [c2, c1];

    parentMap.set(absorbed, survivor);
    countMap.set(survivor, cnt1 + cnt2);
    countMap.delete(absorbed);

    const absorbedIdx = activeColors.indexOf(absorbed);
    if (absorbedIdx !== -1) {
      activeColors.splice(absorbedIdx, 1);
    }
  }

  // 3. 应用合并映射到最终像素网格
  const newCells = cells.map(c => {
    if (c < 0) return -1;
    return getRoot(c);
  });

  const finalUsed = Array.from(new Set(newCells.filter(c => c >= 0))).sort((a, b) => a - b);
  return {
    cells: newCells,
    usedPaletteIndices: finalUsed,
  };
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
 * 自动边缘去背景算法：
 * 从四周边框边缘像素泛洪寻找与背景色相近的连通区域，将其设为透明 (alpha = 0)。
 * 不会误伤物体内部同色区域（如角色眼白、白色衣服等）。
 */
export function removeEdgeBackground(
  imageData: ImageData,
  width: number,
  height: number,
  tolerance = 36
): void {
  const data = imageData.data;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // 1. 采样四边边缘上不透明的像素，统计最具代表性的背景参考色
  const sampleRgb: [number, number, number][] = [];
  const addSample = (x: number, y: number) => {
    const idx = y * width + x;
    const a = data[idx * 4 + 3];
    if (a >= 30) {
      sampleRgb.push([data[idx * 4], data[idx * 4 + 1], data[idx * 4 + 2]]);
    }
  };

  for (let x = 0; x < width; x++) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  if (sampleRgb.length === 0) return; // 边缘已经全部透明

  // 取边缘像素的平均色彩作为背景种子
  let sumR = 0, sumG = 0, sumB = 0;
  for (const [r, g, b] of sampleRgb) {
    sumR += r;
    sumG += g;
    sumB += b;
  }
  const bgR = sumR / sampleRgb.length;
  const bgG = sumG / sampleRgb.length;
  const bgB = sumB / sampleRgb.length;

  const isColorSimilar = (r: number, g: number, b: number) => {
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
  };

  // 2. 将边缘上与背景色相近的像素作为种子放入队列
  const enqueueEdge = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const a = data[idx * 4 + 3];
    if (a < 30) {
      visited[idx] = 1;
      queue.push(idx);
    } else if (isColorSimilar(data[idx * 4], data[idx * 4 + 1], data[idx * 4 + 2])) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueEdge(x, 0);
    enqueueEdge(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueueEdge(0, y);
    enqueueEdge(width - 1, y);
  }

  // 3. 广度优先泛洪 (BFS) 消除边缘连通背景
  while (queue.length > 0) {
    const curr = queue.shift()!;
    data[curr * 4 + 3] = 0;

    const cx = curr % width;
    const cy = Math.floor(curr / width);

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx]) {
          const a = data[nIdx * 4 + 3];
          if (a < 30) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          } else if (isColorSimilar(data[nIdx * 4], data[nIdx * 4 + 1], data[nIdx * 4 + 2])) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }
}

/**
 * 少量颜色合并：
 * 统计量化后各色号的使用频次，将用量极少（如低于阈值或占总颗数极低）的非关键杂色，
 * 替换为当前已使用的且在视觉色差 (CIELAB Delta E) 上最近的主色。
 */
export function mergeLowUsageColors(
  cells: number[],
  palette: BeadColor[],
  minCountThreshold = 3,
  minPercentThreshold = 0.015
): number[] {
  const result = [...cells];
  const countMap = new Map<number, number>();
  let totalBeads = 0;

  for (const c of result) {
    if (c >= 0) {
      countMap.set(c, (countMap.get(c) || 0) + 1);
      totalBeads++;
    }
  }

  if (totalBeads === 0 || countMap.size <= 2) return result;

  const rareColors: number[] = [];
  const dominantColors: number[] = [];

  for (const [colorIdx, count] of countMap.entries()) {
    const ratio = count / totalBeads;
    if (count <= minCountThreshold || ratio < minPercentThreshold) {
      rareColors.push(colorIdx);
    } else {
      dominantColors.push(colorIdx);
    }
  }

  if (dominantColors.length === 0 || rareColors.length === 0) return result;

  const replaceMap = new Map<number, number>();
  for (const rareIdx of rareColors) {
    const rareColor = palette[rareIdx];
    if (!rareColor) continue;

    let minDelta = Infinity;
    let targetIdx = dominantColors[0];

    for (const domIdx of dominantColors) {
      const domColor = palette[domIdx];
      if (!domColor) continue;
      const delta = ciede2000(rareColor.lab, domColor.lab);
      if (delta < minDelta) {
        minDelta = delta;
        targetIdx = domIdx;
      }
    }
    replaceMap.set(rareIdx, targetIdx);
  }

  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    if (c >= 0 && replaceMap.has(c)) {
      result[i] = replaceMap.get(c)!;
    }
  }

  return result;
}

/**
 * 微小连通区域清理平滑：
 * 基于 4-连通域标记，找出小于 minSize（默认 2 颗）的微小杂色碎块，
 * 并将其合并为周围相邻出现频次最高的优势主色。
 */
export function cleanSmallConnectedRegions(
  cells: number[],
  width: number,
  height: number,
  minRegionSize = 2
): number[] {
  const result = [...cells];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const startIdx = y * width + x;
      if (visited[startIdx] || result[startIdx] === -1) continue;

      const targetColor = result[startIdx];
      const component: number[] = [];
      const queue: number[] = [startIdx];
      visited[startIdx] = 1;

      while (queue.length > 0) {
        const curr = queue.pop()!;
        component.push(curr);

        const cx = curr % width;
        const cy = Math.floor(curr / width);

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx] && result[nIdx] === targetColor) {
              visited[nIdx] = 1;
              queue.push(nIdx);
            }
          }
        }
      }

      // 如果连通区域颗粒数过小，寻找周围邻居优势色替换
      if (component.length <= minRegionSize) {
        const neighborColorCounts = new Map<number, number>();

        for (const cellIdx of component) {
          const cx = cellIdx % width;
          const cy = Math.floor(cellIdx / width);
          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              const nColor = result[nIdx];
              if (nColor !== -1 && nColor !== targetColor) {
                neighborColorCounts.set(nColor, (neighborColorCounts.get(nColor) || 0) + 1);
              }
            }
          }
        }

        if (neighborColorCounts.size > 0) {
          let dominantNeighbor = targetColor;
          let maxCount = 0;
          for (const [col, count] of neighborColorCounts.entries()) {
            if (count > maxCount) {
              maxCount = count;
              dominantNeighbor = col;
            }
          }
          for (const cellIdx of component) {
            result[cellIdx] = dominantNeighbor;
          }
        }
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
  const {
    width,
    height,
    maxColors,
    preset,
    dithering,
    fitMode = 'cover',
    padding = 0,
    removeBackground = false,
    mergeLowUsageColors: shouldMergeLowUsage = false,
    cleanSmallRegions: shouldCleanSmall = false,
  } = options;

  // 1. 采样至目标网格尺寸（包含 padding 内边距留白）
  const imgData = resampleImageToGrid(source, width, height, fitMode, sourceWidth, sourceHeight, padding);
  
  // 1.1 如果开启了自动去背景（或容易完成预设），执行边缘连通去背景
  if (removeBackground || preset === 'easy') {
    removeEdgeBackground(imgData, width, height);
  }

  const data = imgData.data;

  // 2. 根据不同预设进行图像色彩调优
  if (preset === 'retro') {
    // 复古像素风：提升对比度 +20，饱和度 1.35
    applyContrastAndSaturation(data, 20, 1.35);
  } else if (preset === 'easy') {
    // 容易完成：轻度平滑对比度，形成饱满大色块
    applyContrastAndSaturation(data, -5, 1.0);
  }

  // 3. 初次全局最优感知量化（在完整色库中基于 CIEDE2000 寻找最精确拼豆色，避免关键特征色被提前截断）
  const targetMaxColors = Math.min(maxColors, fullPalette.length);
  let cells = new Array<number>(width * height).fill(-1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const a = data[idx * 4 + 3];
      if (a < 30) continue;

      const r = data[idx * 4];
      const g = data[idx * 4 + 1];
      const b = data[idx * 4 + 2];
      cells[idx] = findClosestColorIndex([r, g, b], fullPalette);
    }
  }

  // 4. 执行智能渐进式合并，将超出 targetMaxColors 种的次要色平滑收敛至主色
  const reductionResult = smartReducePalette(cells, fullPalette, targetMaxColors);
  cells = reductionResult.cells;
  const activePaletteIndices = reductionResult.usedPaletteIndices;

  // 4.1 若开启了 detail 预设且勾选了误差抖动，在精选后的调色板上重新执行 Floyd-Steinberg 扩散
  const useDithering = dithering && preset === 'detail' && activePaletteIndices.length > 1;
  if (useDithering) {
    const activePalette = activePaletteIndices.map(idx => fullPalette[idx]);
    const bufferR = new Float32Array(width * height);
    const bufferG = new Float32Array(width * height);
    const bufferB = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      bufferR[i] = data[i * 4];
      bufferG[i] = data[i * 4 + 1];
      bufferB[i] = data[i * 4 + 2];
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (data[idx * 4 + 3] < 30) {
          cells[idx] = -1;
          continue;
        }

        const r = Math.min(255, Math.max(0, bufferR[idx]));
        const g = Math.min(255, Math.max(0, bufferG[idx]));
        const b = Math.min(255, Math.max(0, bufferB[idx]));

        const localBestIdx = findClosestColorIndex([r, g, b], activePalette);
        const originalPaletteIndex = activePaletteIndices[localBestIdx] ?? 0;
        cells[idx] = originalPaletteIndex;

        const matchedColor = fullPalette[originalPaletteIndex];
        if (matchedColor) {
          const errR = r - matchedColor.rgb[0];
          const errG = g - matchedColor.rgb[1];
          const errB = b - matchedColor.rgb[2];

          const distribute = (nx: number, ny: number, factor: number) => {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (data[nIdx * 4 + 3] >= 30) {
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

  let finalCells = cells;

  // 5. 算法优化阶段：少量颜色合并
  if (shouldMergeLowUsage || preset === 'easy') {
    finalCells = mergeLowUsageColors(finalCells, fullPalette);
  }

  // 6. 微小连通区域清理
  if (shouldCleanSmall || preset === 'easy' || preset === 'retro') {
    finalCells = cleanSmallConnectedRegions(finalCells, width, height);
  }

  // 7. 若是“容易完成”预设，执行孤岛合并
  if (preset === 'easy') {
    finalCells = removeSingleIslands(finalCells, width, height);
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

import { describe, expect, it } from 'vitest';
import {
  removeEdgeBackground,
  mergeLowUsageColors,
  cleanSmallConnectedRegions,
  smartReducePalette,
} from './quantizeEngine';
import { STANDARD_PALETTE } from '../palette/standardPalette';
import { ciede2000, findClosestColorIndex } from '../palette/colorDistance';

describe('quantizeEngine optimization algorithms', () => {
  describe('removeEdgeBackground', () => {
    it('removes outer connected background while preserving interior same-color regions', () => {
      // 创建 5x5 的 ImageData
      // 外圈是白色 (255, 255, 255, 255)
      // 内圈 (1,1)-(3,3) 是黑色 (0, 0, 0, 255)
      // 中心 (2,2) 是白色眼球 (255, 255, 255, 255)
      const width = 5;
      const height = 5;
      const data = new Uint8ClampedArray(width * height * 4);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (x === 2 && y === 2) {
            // 中心内部白色
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          } else if (x >= 1 && x <= 3 && y >= 1 && y <= 3) {
            // 黑色隔离环
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 255;
          } else {
            // 外围边缘白色背景
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = 255;
          }
        }
      }

      const imgData = { data, width, height } as ImageData;
      removeEdgeBackground(imgData, width, height, 20);

      // 外围边缘 (0,0) 应该被置为透明 (alpha = 0)
      const edgeAlpha = data[(0 * width + 0) * 4 + 3];
      expect(edgeAlpha).toBe(0);

      // 黑色隔离环 (1,1) 应该保持不透明 (alpha = 255)
      const ringAlpha = data[(1 * width + 1) * 4 + 3];
      expect(ringAlpha).toBe(255);

      // 关键：内部白色眼球 (2,2) 绝对不应该被误伤！必须保持 alpha = 255
      const interiorAlpha = data[(2 * width + 2) * 4 + 3];
      expect(interiorAlpha).toBe(255);
    });
  });

  describe('mergeLowUsageColors', () => {
    it('merges low frequency colors into nearest dominant palette color', () => {
      // 构造 20 颗豆子：
      // 10 颗纯白 (A01, index 0), 8 颗曜石黑 (A02, index 1), 2 颗象牙白 (A13, index 12)
      // 象牙白用量极低 (<= 2 颗)，应被合并到视觉最接近的纯白 (index 0)
      const cells = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        1, 1, 1, 1, 1, 1, 1, 1,
        12, 12,
      ];

      const merged = mergeLowUsageColors(cells, STANDARD_PALETTE, 2, 0.15);

      // 象牙白 (12) 应该被合并为纯白 (0)
      expect(merged[18]).toBe(0);
      expect(merged[19]).toBe(0);
      // 主色不变
      expect(merged[0]).toBe(0);
      expect(merged[10]).toBe(1);
    });
  });

  describe('cleanSmallConnectedRegions', () => {
    it('cleans small connected regions of size <= 2 by absorbing into dominant neighbor', () => {
      // 4x4 网格：绝大部分是颜色 1
      // 坐标 (1,1) 和 (1,2) 是微小区域颜色 2 (长度 2 <= minSize 2)
      const width = 4;
      const height = 4;
      const cells = [
        1, 1, 1, 1,
        1, 2, 2, 1,
        1, 1, 1, 1,
        1, 1, 1, 1,
      ];

      const cleaned = cleanSmallConnectedRegions(cells, width, height, 2);

      // 杂色碎块 (1,1) 和 (1,2) 应该被相邻的主色 1 吸收
      expect(cleaned[1 * width + 1]).toBe(1);
      expect(cleaned[1 * width + 2]).toBe(1);
    });
  });

  describe('smartReducePalette feature preservation', () => {
    it('preserves key high-contrast feature colors (like eyes/outline) even with low bead counts', () => {
      // 场景：大面积绿色渐变背景（草绿 16 颗，翠绿 16 颗，薄荷绿 16 颗），
      // 但人物有 2 颗至关重要的黑色眼睛 (index 1 为 A02 黑色)
      // 当限制最大颜色数 maxColors = 2 时，算法应该优先合并色差较小的绿色系，
      // 绝对不能把高反差的黑色眼睛吃掉！
      // 假设：
      // 色号 5 (A06 草绿): 15 颗
      // 色号 25 (A26 翠绿): 15 颗
      // 色号 24 (A25 薄荷绿): 10 颗
      // 色号 1 (A02 黑色): 2 颗 (极其微量，但色差巨大)
      const cells: number[] = [
        ...new Array(15).fill(5),
        ...new Array(15).fill(25),
        ...new Array(10).fill(24),
        1, 1, // 2 颗黑色眼睛
      ];

      // 压缩到 2 种主色
      const result = smartReducePalette(cells, STANDARD_PALETTE, 2);

      // 黑色 (1) 必须存活！
      expect(result.usedPaletteIndices).toContain(1);
      // 绿色系应该被合并为一个存活的主绿
      expect(result.usedPaletteIndices.length).toBe(2);
      // 黑色像素未被冲刷掉
      expect(result.cells[cells.length - 1]).toBe(1);
      expect(result.cells[cells.length - 2]).toBe(1);
    });
  });

  describe('CIEDE2000 algorithm accuracy', () => {
    it('accurately matches standard Sharma et al. (2005) benchmark cases', () => {
      const benchmarkCases = [
        { lab1: [50.0000, 2.6772, -79.7751] as [number, number, number], lab2: [50.0000, 0.0000, -82.7485] as [number, number, number], expected: 2.0425 },
        { lab1: [50.0000, 3.1571, -77.2803] as [number, number, number], lab2: [50.0000, 0.0000, -82.7485] as [number, number, number], expected: 2.8615 },
        { lab1: [50.0000, 2.8361, -74.0200] as [number, number, number], lab2: [50.0000, 0.0000, -82.7485] as [number, number, number], expected: 3.4412 },
        { lab1: [50.0000, -1.3802, -84.2814] as [number, number, number], lab2: [50.0000, 0.0000, -82.7485] as [number, number, number], expected: 1.0000 },
        { lab1: [50.0000, 0.0000, 0.0000] as [number, number, number], lab2: [50.0000, -1.0000, 2.0000] as [number, number, number], expected: 2.3669 },
        { lab1: [50.0000, 2.4900, -0.0010] as [number, number, number], lab2: [50.0000, -2.4900, 0.0009] as [number, number, number], expected: 7.1792 },
        { lab1: [50.0000, 2.5000, 0.0000] as [number, number, number], lab2: [73.0000, 25.0000, -18.0000] as [number, number, number], expected: 27.1492 },
        { lab1: [60.2574, -34.0099, 36.2677] as [number, number, number], lab2: [60.4626, -34.1751, 39.4387] as [number, number, number], expected: 1.2644 },
      ];

      for (const tc of benchmarkCases) {
        const dE = ciede2000(tc.lab1, tc.lab2);
        expect(Math.abs(dE - tc.expected)).toBeLessThan(0.0005);
      }
    });

    it('accurately identifies skin tone without bias into dull grey or green', () => {
      // 典型柔白肉色 RGB: (255, 241, 232)
      const fleshRgb: [number, number, number] = [255, 241, 232];
      const bestIdx = findClosestColorIndex(fleshRgb, STANDARD_PALETTE);
      const matched = STANDARD_PALETTE[bestIdx];

      // 应当匹配到 A49 柔白肉色或 A12 浅肤色等肤色系列，绝不能匹配成冷灰、杂绿等偏色
      expect(['A49', 'A12', 'A13', 'A01']).toContain(matched.code);
    });
  });
});

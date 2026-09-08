import { describe, expect, it } from 'vitest';
import {
  removeEdgeBackground,
  mergeLowUsageColors,
  cleanSmallConnectedRegions,
} from './quantizeEngine';
import { STANDARD_PALETTE } from '../palette/standardPalette';

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
});

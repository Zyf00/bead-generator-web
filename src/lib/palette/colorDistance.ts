import { BeadColor } from '../types';

/**
 * 将 Hex 颜色字符串转换为 [r, g, b] (0-255)
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(fullHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * 将 RGB (0-255) 转换为 CIELAB [L, a, b]
 * D65 白点标准
 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // 1. sRGB 线性化
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  // 2. 转换至 XYZ (D65)
  const x = (rL * 0.4124 + gL * 0.3576 + bL * 0.1805) / 0.95047;
  const y = (rL * 0.2126 + gL * 0.7152 + bL * 0.0722) / 1.00000;
  const z = (rL * 0.0193 + gL * 0.1192 + bL * 0.9505) / 1.08883;

  // 3. XYZ 转 Lab
  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return [L, a, bVal];
}

/**
 * 计算两个 Lab 颜色的欧式色彩距离 (CIE76 Delta E)
 */
export function labDeltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * 从色卡列表中寻找色彩距离最近的拼豆颜色索引
 */
export function findClosestColorIndex(
  rgb: [number, number, number],
  palette: BeadColor[]
): number {
  const targetLab = rgbToLab(rgb[0], rgb[1], rgb[2]);
  let minDistance = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < palette.length; i++) {
    const dist = labDeltaE(targetLab, palette[i].lab);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}

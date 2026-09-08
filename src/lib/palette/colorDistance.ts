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
 * 保留用于快速欧式几何估算或对比
 */
export function labDeltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * 工业级 CIEDE2000 色彩感知差异算法 (Delta E 00)
 * 严格遵循 CIE Technical Report 142-2001 及 Sharma et al. (2005) 标准实现
 * 彻底解决传统 CIE76 在高彩度区域、人眼敏感肤色阶梯以及蓝紫区域的非线性失真
 */
export function ciede2000(
  lab1: [number, number, number],
  lab2: [number, number, number],
  kL = 1,
  kC = 1,
  kH = 1
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  // 1. 计算色度 C1, C2 和均值 C_bar
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const C_bar = (C1 + C2) / 2;

  // 2. 轴向非对称因子 G 和修正后的 a'1, a'2
  const C_bar7 = Math.pow(C_bar, 7);
  const G = 0.5 * (1 - Math.sqrt(C_bar7 / (C_bar7 + 6103515625))); // 25^7 = 6103515625

  const a1_prime = (1 + G) * a1;
  const a2_prime = (1 + G) * a2;

  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);

  // 3. 计算色相角 h'1, h'2 (0 到 360 度)
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  let h1_prime = deg(Math.atan2(b1, a1_prime));
  if (h1_prime < 0) h1_prime += 360;

  let h2_prime = deg(Math.atan2(b2, a2_prime));
  if (h2_prime < 0) h2_prime += 360;

  // 4. 计算明度、色度与色相差
  const delta_L_prime = L2 - L1;
  const delta_C_prime = C2_prime - C1_prime;

  let delta_h_prime = 0;
  if (C1_prime * C2_prime !== 0) {
    const diff = h2_prime - h1_prime;
    if (Math.abs(diff) <= 180) {
      delta_h_prime = diff;
    } else if (diff > 180) {
      delta_h_prime = diff - 360;
    } else {
      delta_h_prime = diff + 360;
    }
  }

  // 5. 计算色相差向量 ΔH'
  const delta_H_prime =
    2 *
    Math.sqrt(C1_prime * C2_prime) *
    Math.sin(rad(delta_h_prime / 2));

  // 6. 计算均值 L'_bar, C'_bar, h'_bar
  const L_bar_prime = (L1 + L2) / 2;
  const C_bar_prime = (C1_prime + C2_prime) / 2;

  let h_bar_prime = 0;
  if (C1_prime * C2_prime === 0) {
    h_bar_prime = h1_prime + h2_prime;
  } else {
    const diff = Math.abs(h1_prime - h2_prime);
    const sum = h1_prime + h2_prime;
    if (diff <= 180) {
      h_bar_prime = sum / 2;
    } else if (sum < 360) {
      h_bar_prime = (sum + 360) / 2;
    } else {
      h_bar_prime = (sum - 360) / 2;
    }
  }

  // 7. 色相补偿权重因子 T
  const T =
    1 -
    0.17 * Math.cos(rad(h_bar_prime - 30)) +
    0.24 * Math.cos(rad(2 * h_bar_prime)) +
    0.32 * Math.cos(rad(3 * h_bar_prime + 6)) -
    0.2 * Math.cos(rad(4 * h_bar_prime - 63));

  // 8. 权重函数 S_L, S_C, S_H
  const L_50_sq = Math.pow(L_bar_prime - 50, 2);
  const S_L = 1 + (0.015 * L_50_sq) / Math.sqrt(20 + L_50_sq);
  const S_C = 1 + 0.045 * C_bar_prime;
  const S_H = 1 + 0.015 * C_bar_prime * T;

  // 9. 蓝区椭圆旋转因子 R_T
  const delta_theta = 30 * Math.exp(-Math.pow((h_bar_prime - 275) / 25, 2));
  const C_bar_prime7 = Math.pow(C_bar_prime, 7);
  const R_C = 2 * Math.sqrt(C_bar_prime7 / (C_bar_prime7 + 6103515625));
  const R_T = -Math.sin(rad(2 * delta_theta)) * R_C;

  // 10. 计算最终感知色差 ΔE_00
  const termL = delta_L_prime / (kL * S_L);
  const termC = delta_C_prime / (kC * S_C);
  const termH = delta_H_prime / (kH * S_H);

  return Math.sqrt(
    termL * termL +
    termC * termC +
    termH * termH +
    R_T * termC * termH
  );
}

/**
 * 从色卡列表中寻找色彩距离最近的拼豆颜色索引（基于 CIEDE2000 工业标准）
 */
export function findClosestColorIndex(
  rgb: [number, number, number],
  palette: BeadColor[]
): number {
  const targetLab = rgbToLab(rgb[0], rgb[1], rgb[2]);
  let minDistance = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < palette.length; i++) {
    const dist = ciede2000(targetLab, palette[i].lab);
    if (dist < minDistance) {
      minDistance = dist;
      bestIndex = i;
    }
  }

  return bestIndex;
}

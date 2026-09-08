import { BeadColor } from '../types';
import { hexToRgb, rgbToLab } from './colorDistance';

interface RawColorDefinition {
  code: string;
  name: string;
  hex: string;
}

// 国内外主流拼豆（Artkal / Mard / Perler 兼容标准色表 48 常用色）
const RAW_COLORS: RawColorDefinition[] = [
  { code: 'A01', name: '纯白', hex: '#FFFFFF' },
  { code: 'A02', name: '黑色', hex: '#1C1C1C' },
  { code: 'A03', name: '大红', hex: '#DC2626' },
  { code: 'A04', name: '柠檬黄', hex: '#FDE047' },
  { code: 'A05', name: '天蓝', hex: '#38BDF8' },
  { code: 'A06', name: '草绿', hex: '#4ADE80' },
  { code: 'A07', name: '深棕', hex: '#582F19' },
  { code: 'A08', name: '浅粉', hex: '#FBCFE8' },
  { code: 'A09', name: '亮橙', hex: '#FB923C' },
  { code: 'A10', name: '深紫', hex: '#7E22CE' },
  { code: 'A11', name: '中灰', hex: '#9CA3AF' },
  { code: 'A12', name: '浅肤色', hex: '#FFE4D6' },

  { code: 'A13', name: '象牙白', hex: '#F8FAFC' },
  { code: 'A14', name: '浅灰', hex: '#D1D5DB' },
  { code: 'A15', name: '深灰', hex: '#4B5563' },
  { code: 'A16', name: '酒红', hex: '#881337' },
  { code: 'A17', name: '珊瑚粉', hex: '#F472B6' },
  { code: 'A18', name: '桃红', hex: '#EC4899' },
  { code: 'A19', name: '金黄', hex: '#EAB308' },
  { code: 'A20', name: '浅黄', hex: '#FEF08A' },
  { code: 'A21', name: '卡其色', hex: '#D97706' },
  { code: 'A22', name: '焦糖棕', hex: '#9A3412' },
  { code: 'A23', name: '浅棕', hex: '#A87954' },
  { code: 'A24', name: '奶黄', hex: '#FEF9C3' },

  { code: 'A25', name: '薄荷绿', hex: '#86EFAC' },
  { code: 'A26', name: '翠绿', hex: '#16A34A' },
  { code: 'A27', name: '深绿', hex: '#14532D' },
  { code: 'A28', name: '橄榄绿', hex: '#65A30D' },
  { code: 'A29', name: '松石绿', hex: '#0D9488' },
  { code: 'A30', name: '湖蓝', hex: '#0284C7' },
  { code: 'A31', name: '深海蓝', hex: '#1E3A8A' },
  { code: 'A32', name: '皇室蓝', hex: '#2563EB' },
  { code: 'A33', name: '紫罗兰', hex: '#A855F7' },
  { code: 'A34', name: '浅紫', hex: '#E9D5FF' },
  { code: 'A35', name: '丁香紫', hex: '#C084FC' },
  { code: 'A36', name: '肉粉', hex: '#FECDD3' },

  { code: 'A37', name: '荧光黄', hex: '#CCFF00' },
  { code: 'A38', name: '杏色', hex: '#FDE68A' },
  { code: 'A39', name: '西瓜红', hex: '#FB7185' },
  { code: 'A40', name: '深牛仔蓝', hex: '#1E293B' },
  { code: 'A41', name: '灰蓝', hex: '#64748B' },
  { code: 'A42', name: '灰绿', hex: '#4D7C0F' },
  { code: 'A43', name: '深炭黑', hex: '#09090B' },
  { code: 'A44', name: '冷白', hex: '#F1F5F9' },
  { code: 'A45', name: '米黄', hex: '#F5F5DC' },
  { code: 'A46', name: '红棕', hex: '#78350F' },
  { code: 'A47', name: '灰粉', hex: '#FDA4AF' },
  { code: 'A48', name: '淡青', hex: '#A7F3D0' },
];

/**
 * 完整标准 48 色拼豆色卡（预先计算好 RGB 和 CIELAB 坐标）
 */
export const STANDARD_PALETTE: BeadColor[] = RAW_COLORS.map((item, index) => {
  const rgb = hexToRgb(item.hex);
  const lab = rgbToLab(rgb[0], rgb[1], rgb[2]);
  return {
    id: `color-${index + 1}`,
    code: item.code,
    name: item.name,
    hex: item.hex,
    rgb,
    lab,
    brand: 'Standard / Artkal / Mard 通用',
  };
});

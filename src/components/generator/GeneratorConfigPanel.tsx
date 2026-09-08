'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  Sparkles,
  Zap,
  Gamepad2,
  Maximize2,
  Ratio,
  Crop as CropIcon,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { GenerationPreset, GeneratorFitMode } from '../../lib/types';

interface GeneratorConfigPanelProps {
  isProcessing: boolean;
}

export const GeneratorConfigPanel: React.FC<GeneratorConfigPanelProps> = ({
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customW, setCustomW] = useState('29');
  const [customH, setCustomH] = useState('29');

  const {
    sourceImage,
    sourceNaturalSize,
    generationOptions,
    updateGenerationOptions,
    setSourceImage,
    project,
    setBeadSize,
  } = useEditorStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          setSourceImage(dataUrl, { width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = dataUrl;
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSelectFitMode = (mode: GeneratorFitMode) => {
    updateGenerationOptions({ fitMode: mode });
    if (mode === 'auto_grid' && sourceNaturalSize) {
      const maxSide = generationOptions.width >= 40 || generationOptions.height >= 40 ? 58 : 29;
      const nw = sourceNaturalSize.width;
      const nh = sourceNaturalSize.height;
      if (nw >= nh) {
        updateGenerationOptions({
          fitMode: mode,
          width: maxSide,
          height: Math.max(10, Math.round(maxSide * (nh / nw))),
        });
      } else {
        updateGenerationOptions({
          fitMode: mode,
          height: maxSide,
          width: Math.max(10, Math.round(maxSide * (nw / nh))),
        });
      }
    } else if (mode === 'contain') {
      if (generationOptions.width !== generationOptions.height) {
        const side = generationOptions.width >= 40 || generationOptions.height >= 40 ? 58 : 29;
        updateGenerationOptions({
          fitMode: mode,
          width: side,
          height: side,
        });
      }
    }
  };

  const handleSelectPreset = (p: GenerationPreset) => {
    if (p === 'detail') {
      updateGenerationOptions({
        preset: 'detail',
        dithering: true,
        maxColors: 24,
        removeBackground: false,
        mergeLowUsageColors: false,
        cleanSmallRegions: false,
      });
    } else if (p === 'easy') {
      updateGenerationOptions({
        preset: 'easy',
        dithering: false,
        maxColors: 12,
        removeBackground: true,
        mergeLowUsageColors: true,
        cleanSmallRegions: true,
      });
    } else if (p === 'retro') {
      updateGenerationOptions({
        preset: 'retro',
        dithering: false,
        maxColors: 16,
        removeBackground: false,
        mergeLowUsageColors: false,
        cleanSmallRegions: true,
      });
    }
  };

  const handleApplyCustomSize = () => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (!isNaN(w) && !isNaN(h) && w >= 10 && w <= 120 && h >= 10 && h <= 120) {
      updateGenerationOptions({ width: w, height: h });
    } else {
      alert('请输入 10 ~ 120 之间的有效网格尺寸');
    }
  };

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full select-none z-10">
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <span className="font-bold text-slate-800 text-xs tracking-wide">生成参数配置</span>
        {isProcessing ? (
          <span className="text-[11px] text-orange-600 font-semibold animate-pulse">正在重新量化...</span>
        ) : (
          <span className="text-[11px] text-slate-400">实时计算</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* 1. 源图片状态 */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700">参考原图</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-h-24 px-2.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
            >
              更换图片
            </button>
          </div>

          {sourceImage ? (
            <div className="flex items-center gap-3 pt-1">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourceImage}
                  alt="原图预览"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate">
                  已载入原图
                </span>
                {sourceNaturalSize && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    {sourceNaturalSize.width} × {sourceNaturalSize.height} px
                  </span>
                )}
                <span className="text-[10px] text-emerald-600 font-semibold">
                  就绪并已自动量化
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-300 hover:border-orange-500 rounded-lg p-3 text-center cursor-pointer bg-white transition-colors"
            >
              <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
              <span className="text-[11px] text-slate-600 block font-medium">点击选择本地图片</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* 2. 构图与放置模式 */}
        <div>
          <span className="font-bold text-slate-800 block mb-2">构图与放置模式</span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleSelectFitMode('contain')}
              className={`p-2 rounded-xl border text-center transition-all ${
                generationOptions.fitMode === 'contain'
                  ? 'border-orange-500 bg-orange-50/80 shadow-2xs font-bold text-orange-700'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <Maximize2 className="w-4 h-4 mx-auto mb-1 text-orange-500" />
              <span className="block font-bold leading-tight">整图放入</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">居中不切图</span>
            </button>

            <button
              onClick={() => handleSelectFitMode('auto_grid')}
              className={`p-2 rounded-xl border text-center transition-all ${
                generationOptions.fitMode === 'auto_grid'
                  ? 'border-orange-500 bg-orange-50/80 shadow-2xs font-bold text-orange-700'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <Ratio className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <span className="block font-bold leading-tight">自适应网格</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">按图定长宽</span>
            </button>

            <button
              onClick={() => handleSelectFitMode('cover')}
              className={`p-2 rounded-xl border text-center transition-all ${
                generationOptions.fitMode === 'cover'
                  ? 'border-orange-500 bg-orange-50/80 shadow-2xs font-bold text-orange-700'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <CropIcon className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
              <span className="block font-bold leading-tight">局部特写</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">充满网格</span>
            </button>
          </div>
        </div>

        {/* 3. 三大预设方案 */}
        <div>
          <span className="font-bold text-slate-800 block mb-2">生成方案预设</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSelectPreset('detail')}
              className={`p-2 rounded-xl border text-center transition-all ${
                generationOptions.preset === 'detail'
                  ? 'border-orange-500 bg-orange-50/60 shadow-2xs font-bold text-orange-700'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 mx-auto mb-1 text-orange-500" />
              <span className="block font-bold">细节优先</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">平滑过渡</span>
            </button>

            <button
              onClick={() => handleSelectPreset('easy')}
              className={`p-2 rounded-xl border text-center transition-all ${
                generationOptions.preset === 'easy'
                  ? 'border-orange-500 bg-orange-50/60 shadow-2xs font-bold text-orange-700'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <span className="block font-bold">易拼优先</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">连片好做</span>
            </button>

            <button
              onClick={() => handleSelectPreset('retro')}
              className={`p-2 rounded-xl border text-center transition-all ${
                generationOptions.preset === 'retro'
                  ? 'border-orange-500 bg-orange-50/60 shadow-2xs font-bold text-orange-700'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
              <span className="block font-bold">复古像素</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">鲜艳分明</span>
            </button>
          </div>
        </div>

        {/* 4. 网格尺寸预设 */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-bold text-slate-800">目标网格尺寸</span>
            <span className="font-mono font-bold text-slate-600">
              {generationOptions.width} × {generationOptions.height}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => {
                if (generationOptions.fitMode === 'auto_grid' && sourceNaturalSize) {
                  const nw = sourceNaturalSize.width;
                  const nh = sourceNaturalSize.height;
                  updateGenerationOptions({
                    width: nw >= nh ? 29 : Math.max(10, Math.round(29 * (nw / nh))),
                    height: nw >= nh ? Math.max(10, Math.round(29 * (nh / nw))) : 29,
                  });
                } else {
                  updateGenerationOptions({ width: 29, height: 29 });
                }
              }}
              className={`btn-h-32 rounded-lg border text-xs transition-colors ${
                generationOptions.width === 29 &&
                (generationOptions.fitMode !== 'auto_grid' ? generationOptions.height === 29 : true)
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              29 × 29 (标准小方板)
            </button>

            <button
              onClick={() => {
                if (generationOptions.fitMode === 'auto_grid' && sourceNaturalSize) {
                  const nw = sourceNaturalSize.width;
                  const nh = sourceNaturalSize.height;
                  updateGenerationOptions({
                    width: nw >= nh ? 58 : Math.max(10, Math.round(58 * (nw / nh))),
                    height: nw >= nh ? Math.max(10, Math.round(58 * (nh / nw))) : 58,
                  });
                } else {
                  updateGenerationOptions({ width: 58, height: 58 });
                }
              }}
              className={`btn-h-32 rounded-lg border text-xs transition-colors ${
                generationOptions.width === 58 &&
                (generationOptions.fitMode !== 'auto_grid' ? generationOptions.height === 58 : true)
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              58 × 58 (4拼板拼接)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="10"
              max="120"
              value={customW}
              onChange={(e) => setCustomW(e.target.value)}
              placeholder="宽"
              className="btn-h-28 w-16 px-2 border border-slate-200 rounded text-center outline-none focus:border-orange-500"
            />
            <span className="text-slate-400">×</span>
            <input
              type="number"
              min="10"
              max="120"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              placeholder="高"
              className="btn-h-28 w-16 px-2 border border-slate-200 rounded text-center outline-none focus:border-orange-500"
            />
            <button
              onClick={handleApplyCustomSize}
              className="btn-h-28 px-3 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700 transition-colors"
            >
              应用尺寸
            </button>
          </div>
        </div>

        {/* 5. 拼豆实体规格 */}
        <div>
          <span className="font-bold text-slate-800 block mb-1.5">拼豆物理规格</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBeadSize('2.6mm')}
              className={`p-2 rounded-lg border text-left transition-all ${
                project.beadSize === '2.6mm'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <span className="font-bold block">2.6mm 迷你豆</span>
              <span className="text-[10px] text-slate-500 block">挂件/摆件，细腻精致</span>
            </button>

            <button
              onClick={() => setBeadSize('5.0mm')}
              className={`p-2 rounded-lg border text-left transition-all ${
                project.beadSize === '5.0mm'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <span className="font-bold block">5.0mm 标准豆</span>
              <span className="text-[10px] text-slate-500 block">杯垫/大板，不累眼</span>
            </button>
          </div>
        </div>

        {/* 6. 边缘留白 */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-bold text-slate-800">边缘留白 (内边距)</span>
            <span className="font-mono font-bold text-slate-600">
              {generationOptions.padding === 0
                ? '无留白 (贴满)'
                : `四周各留 ${generationOptions.padding} 格`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateGenerationOptions({ padding: 0 })}
              className={`btn-h-32 rounded-lg border text-xs transition-colors ${
                generationOptions.padding === 0
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              无留白
            </button>
            <button
              onClick={() => updateGenerationOptions({ padding: 1 })}
              className={`btn-h-32 rounded-lg border text-xs transition-colors ${
                generationOptions.padding === 1
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              留白 1 格 (推荐)
            </button>
            <button
              onClick={() => updateGenerationOptions({ padding: 2 })}
              className={`btn-h-32 rounded-lg border text-xs transition-colors ${
                generationOptions.padding === 2
                  ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              留白 2 格
            </button>
          </div>
        </div>

        {/* 7. 色数上限 */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-slate-800">允许使用色数上限</span>
            <span className="font-bold text-orange-600">{generationOptions.maxColors} 色</span>
          </div>
          <input
            type="range"
            min={6}
            max={36}
            step={2}
            value={generationOptions.maxColors}
            onChange={(e) => updateGenerationOptions({ maxColors: Number(e.target.value) })}
            className="w-full accent-orange-600"
          />
        </div>

        {/* 8. 高级图纸优化选项 (折叠面板) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors"
          >
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>智能优化选项 (实做保障)</span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-3 pt-0 flex flex-col gap-2.5 border-t border-slate-200/60 text-xs">
              {/* 自动去背景 */}
              <label className="flex items-center justify-between cursor-pointer select-none py-1">
                <div>
                  <span className="font-bold text-slate-800 block">自动去背景</span>
                  <span className="text-[11px] text-slate-500 block">
                    去除相近边缘背景，透明像素保持空孔
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={generationOptions.removeBackground ?? false}
                  onChange={(e) =>
                    updateGenerationOptions({ removeBackground: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>

              {/* 少量颜色合并 */}
              <label className="flex items-center justify-between cursor-pointer select-none py-1 border-t border-slate-200/40">
                <div>
                  <span className="font-bold text-slate-800 block">少量颜色合并</span>
                  <span className="text-[11px] text-slate-500 block">
                    将极低用量的杂色合并为相近主色，省色好拼
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={generationOptions.mergeLowUsageColors ?? false}
                  onChange={(e) =>
                    updateGenerationOptions({ mergeLowUsageColors: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>

              {/* 小区域清理平滑 */}
              <label className="flex items-center justify-between cursor-pointer select-none py-1 border-t border-slate-200/40">
                <div>
                  <span className="font-bold text-slate-800 block">小区域清理平滑</span>
                  <span className="text-[11px] text-slate-500 block">
                    消除小于 2 颗的离散微小色块，连片整齐
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={generationOptions.cleanSmallRegions ?? false}
                  onChange={(e) =>
                    updateGenerationOptions({ cleanSmallRegions: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-600 rounded"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

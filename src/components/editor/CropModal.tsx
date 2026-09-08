'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import {
  Upload,
  X,
  Sparkles,
  Zap,
  Gamepad2,
  Check,
  RefreshCw,
  Maximize2,
  Ratio,
  Crop as CropIcon,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { GenerationPreset } from '../../lib/types';
import { quantizeImageToGrid } from '../../lib/quantize/quantizeEngine';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type PlacementFitMode = 'contain' | 'auto_grid' | 'cover';

export const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const { palette, applyGeneratedCells } = useEditorStore();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [fitMode, setFitMode] = useState<PlacementFitMode>('contain');
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // 生成参数
  const [targetWidth, setTargetWidth] = useState(29);
  const [targetHeight, setTargetHeight] = useState(29);
  const [maxColors, setMaxColors] = useState(24);
  const [preset, setPreset] = useState<GenerationPreset>('detail');
  const [dithering, setDithering] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // 临时生成的拼豆结果（携带当时的网格宽高，避免异步竞态越界）
  const [generatedResult, setGeneratedResult] = useState<{
    cells: number[];
    width: number;
    height: number;
    usedPaletteIndices: number[];
  } | null>(null);

  // 读取上传图片
  // 读取上传图片并获取原始宽高
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const dataUrl = reader.result as string;
        setImageSrc(dataUrl);
        setGeneratedResult(null);

        const img = new Image();
        img.onload = () => {
          setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          // 默认对于非正方形图，使用“整图放入（居中留空）”模式
          setFitMode('contain');
        };
        img.src = dataUrl;
      });
      reader.readAsDataURL(file);
    }
  };

  // 切换构图与摆放模式
  const handleSelectFitMode = (mode: PlacementFitMode) => {
    setFitMode(mode);
    if (mode === 'auto_grid' && imgNaturalSize) {
      const maxSide = targetWidth >= 40 || targetHeight >= 40 ? 58 : 29;
      const nw = imgNaturalSize.width;
      const nh = imgNaturalSize.height;
      if (nw >= nh) {
        setTargetWidth(maxSide);
        setTargetHeight(Math.max(10, Math.round(maxSide * (nh / nw))));
      } else {
        setTargetHeight(maxSide);
        setTargetWidth(Math.max(10, Math.round(maxSide * (nw / nh))));
      }
    } else if (mode === 'contain') {
      // 保持标准方板
      if (targetWidth !== targetHeight) {
        const side = targetWidth >= 40 || targetHeight >= 40 ? 58 : 29;
        setTargetWidth(side);
        setTargetHeight(side);
      }
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 执行裁切并运行量化算法
  const runQuantization = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels || croppedAreaPixels.width === 0 || croppedAreaPixels.height === 0) return;

    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth !== 0) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = reject;
        }
      });

      // 离屏裁切 Canvas
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = croppedAreaPixels.width;
      cropCanvas.height = croppedAreaPixels.height;
      const ctx = cropCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      // 量化计算（锁定当前目标宽高）
      const currentW = targetWidth;
      const currentH = targetHeight;
      const quantizeFitMode = fitMode === 'contain' ? 'contain' : 'cover';

      const result = quantizeImageToGrid(
        cropCanvas,
        {
          width: currentW,
          height: currentH,
          maxColors,
          preset,
          beadSize: '2.6mm',
          dithering,
          fitMode: quantizeFitMode,
        },
        palette,
        cropCanvas.width,
        cropCanvas.height
      );

      setGeneratedResult({
        ...result,
        width: currentW,
        height: currentH,
      });
    } catch (err) {
      console.error('量化生成错误', err);
    } finally {
      setIsProcessing(false);
    }
  }, [
    imageSrc,
    croppedAreaPixels,
    targetWidth,
    targetHeight,
    maxColors,
    preset,
    dithering,
    fitMode,
    palette,
  ]);

  // 当参数或裁切变化时，防抖重新生成预览
  useEffect(() => {
    if (!imageSrc || !croppedAreaPixels) return;
    const timer = setTimeout(() => {
      runQuantization();
    }, 200);
    return () => clearTimeout(timer);
  }, [imageSrc, croppedAreaPixels, targetWidth, targetHeight, maxColors, preset, dithering, runQuantization]);

  // 绘制即时拼豆预览
  useEffect(() => {
    if (!generatedResult || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 严格使用结果对象内部绑定的网格宽高，杜绝异步竞态导致的越界
    const resW = generatedResult.width;
    const resH = generatedResult.height;
    const cells = generatedResult.cells;

    const cellSize = Math.floor(Math.min(260 / resW, 260 / resH));
    canvas.width = resW * cellSize;
    canvas.height = resH * cellSize;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const radius = (cellSize / 2) * 0.88;
    const holeRadius = radius * 0.3;

    for (let y = 0; y < resH; y++) {
      for (let x = 0; x < resW; x++) {
        const idx = y * resW + x;
        const colorIdx = cells[idx];
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;

        if (colorIdx === -1 || colorIdx === undefined) {
          // 绘制底板空孔，直观展示居中留空效果
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.5, holeRadius * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = '#E2E8F0';
          ctx.fill();
          continue;
        }

        const color = palette[colorIdx];
        if (!color) continue; // 关键防御性保护：避免色卡越界报错

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = color.hex;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fill();
      }
    }
  }, [generatedResult, palette]);

  // 确认应用到画布
  const handleConfirm = () => {
    if (!generatedResult) return;
    applyGeneratedCells(generatedResult.cells, generatedResult.width, generatedResult.height);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 标题栏 */}
        <div className="header-bar-h px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-600" />
            <span className="font-bold text-slate-800 text-base">导入图片并生成拼豆图</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* 左侧：上传与裁切区 */}
          <div className="flex-1 flex flex-col gap-3 min-w-[320px]">
            {!imageSrc ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer bg-slate-50/60 hover:bg-orange-50/30 transition-all min-h-[360px]"
              >
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="font-bold text-slate-800 text-sm mb-1">
                  点击上传 或 拖拽图片至此处
                </span>
                <span className="text-xs text-slate-400">
                  支持 PNG、JPG、JPEG、WebP 格式
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 h-full">
                <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-slate-900">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={
                      fitMode === 'cover'
                        ? targetWidth / targetHeight
                        : imgNaturalSize
                        ? imgNaturalSize.width / imgNaturalSize.height
                        : 1
                    }
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>

                {/* 缩放滑块与更换图片 */}
                <div className="flex items-center justify-between gap-4 px-1">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-slate-500">缩放:</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 accent-orange-600"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-h-28 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition-colors"
                  >
                    更换图片
                  </button>
                </div>
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

          {/* 右侧：生成参数与即时预览 */}
          <div className="w-full md:w-80 flex flex-col gap-4">
            {/* 构图与摆放模式 */}
            <div>
              <label className="font-bold text-slate-800 text-xs mb-2 block">
                构图与放置模式
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleSelectFitMode('contain')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    fitMode === 'contain'
                      ? 'border-orange-500 bg-orange-50/80 shadow-2xs font-bold text-orange-700'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Maximize2 className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-xs font-bold leading-tight">整图放入</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">居中不切图</div>
                </button>

                <button
                  onClick={() => handleSelectFitMode('auto_grid')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    fitMode === 'auto_grid'
                      ? 'border-orange-500 bg-orange-50/80 shadow-2xs font-bold text-orange-700'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Ratio className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <div className="text-xs font-bold leading-tight">自适应网格</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">按图定长宽</div>
                </button>

                <button
                  onClick={() => handleSelectFitMode('cover')}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    fitMode === 'cover'
                      ? 'border-orange-500 bg-orange-50/80 shadow-2xs font-bold text-orange-700'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <CropIcon className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  <div className="text-xs font-bold leading-tight">局部特写</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">自由裁切</div>
                </button>
              </div>
            </div>

            {/* 三大预设方案 */}
            <div>
              <label className="font-bold text-slate-800 text-xs mb-2 block">
                选择生成倾向方案
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setPreset('detail');
                    setDithering(true);
                    setMaxColors(24);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    preset === 'detail'
                      ? 'border-orange-500 bg-orange-50/60 shadow-2xs font-bold text-orange-700'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-xs font-bold">细节优先</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">平滑过渡</div>
                </button>

                <button
                  onClick={() => {
                    setPreset('easy');
                    setDithering(false);
                    setMaxColors(12);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    preset === 'easy'
                      ? 'border-orange-500 bg-orange-50/60 shadow-2xs font-bold text-orange-700'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                  <div className="text-xs font-bold">容易完成</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">连片色块</div>
                </button>

                <button
                  onClick={() => {
                    setPreset('retro');
                    setDithering(false);
                    setMaxColors(16);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    preset === 'retro'
                      ? 'border-orange-500 bg-orange-50/60 shadow-2xs font-bold text-orange-700'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
                  <div className="text-xs font-bold">复古像素</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">鲜艳分明</div>
                </button>
              </div>
            </div>

            {/* 尺寸规格 */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-bold text-slate-800 text-xs">
                  网格尺寸预设
                </label>
                <span className="text-xs font-mono font-bold text-slate-600">
                  当前: {targetWidth} × {targetHeight}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (fitMode === 'auto_grid' && imgNaturalSize) {
                      const nw = imgNaturalSize.width;
                      const nh = imgNaturalSize.height;
                      if (nw >= nh) {
                        setTargetWidth(29);
                        setTargetHeight(Math.max(10, Math.round(29 * (nh / nw))));
                      } else {
                        setTargetHeight(29);
                        setTargetWidth(Math.max(10, Math.round(29 * (nw / nh))));
                      }
                    } else {
                      setTargetWidth(29);
                      setTargetHeight(29);
                    }
                  }}
                  className={`btn-h-32 flex-1 rounded-lg border text-xs transition-colors ${
                    targetWidth === 29 && (fitMode !== 'auto_grid' ? targetHeight === 29 : true)
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  {fitMode === 'auto_grid' ? '29 边长比例板' : '29 × 29 标准方板'}
                </button>
                <button
                  onClick={() => {
                    if (fitMode === 'auto_grid' && imgNaturalSize) {
                      const nw = imgNaturalSize.width;
                      const nh = imgNaturalSize.height;
                      if (nw >= nh) {
                        setTargetWidth(58);
                        setTargetHeight(Math.max(10, Math.round(58 * (nh / nw))));
                      } else {
                        setTargetHeight(58);
                        setTargetWidth(Math.max(10, Math.round(58 * (nw / nh))));
                      }
                    } else {
                      setTargetWidth(58);
                      setTargetHeight(58);
                    }
                  }}
                  className={`btn-h-32 flex-1 rounded-lg border text-xs transition-colors ${
                    targetWidth === 58 && (fitMode !== 'auto_grid' ? targetHeight === 58 : true)
                      ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                      : 'border-slate-200 text-slate-700'
                  }`}
                >
                  {fitMode === 'auto_grid' ? '58 边长比例板' : '58 × 58 大方板'}
                </button>
              </div>
            </div>

            {/* 色数上限 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-800 text-xs">颜色上限</label>
                <span className="text-xs font-bold text-orange-600">{maxColors} 色</span>
              </div>
              <input
                type="range"
                min={6}
                max={36}
                step={2}
                value={maxColors}
                onChange={(e) => setMaxColors(Number(e.target.value))}
                className="w-full accent-orange-600"
              />
            </div>

            {/* 即时转换预览图 */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center justify-center min-h-[160px]">
              <div className="text-[11px] font-bold text-slate-500 mb-2 w-full flex justify-between items-center">
                <span>拼豆效果实时预览</span>
                {generatedResult && (
                  <span className="text-orange-600">
                    实耗 {generatedResult.usedPaletteIndices.length} 色
                  </span>
                )}
              </div>
              {isProcessing ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-8">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在计算色彩映射...</span>
                </div>
              ) : generatedResult ? (
                <canvas ref={previewCanvasRef} className="rounded shadow-xs max-h-[160px]" />
              ) : (
                <span className="text-xs text-slate-400 py-8">上传图片后自动生成</span>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮栏 */}
        <div className="header-bar-h px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-h-36 px-4 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!generatedResult}
            className="btn-h-36 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>确认导入至画布</span>
          </button>
        </div>
      </div>
    </div>
  );
};

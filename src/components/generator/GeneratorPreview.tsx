'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Tag,
  Upload,
  Sparkles,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

const BASE_CELL_SIZE = 26;

interface GeneratorPreviewProps {
  onSelectImage: (file: File) => void;
  isProcessing: boolean;
}

export const GeneratorPreview: React.FC<GeneratorPreviewProps> = ({
  onSelectImage,
  isProcessing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    project,
    palette,
    sourceImage,
    viewMode,
    setViewMode,
    showGrid,
    setShowGrid,
    showLabels,
    setShowLabels,
    highlightColorIndex,
    highlightCells,
  } = useEditorStore();

  const [scale, setScale] = useState(1);
  const [offsetX, setOffset] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const lastPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 快捷键支持（空格平移）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleResetZoom = () => {
    setScale(1);
    setOffset(0);
    setOffsetY(0);
  };

  // 鼠标滚轮缩放：采用原生事件绑定显式指定 { passive: false }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      setScale((prev) => Math.min(3.5, Math.max(0.3, prev * zoomFactor)));
    };

    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleCanvasWheel);
    };
  }, []);

  const getGridCoordsFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const cellSize = BASE_CELL_SIZE * scale;
      const boardWidth = project.width * cellSize;
      const boardHeight = project.height * cellSize;

      const originX = (rect.width - boardWidth) / 2 + offsetX;
      const originY = (rect.height - boardHeight) / 2 + offsetY;

      const gridX = Math.floor((mouseX - originX) / cellSize);
      const gridY = Math.floor((mouseY - originY) / cellSize);

      if (gridX >= 0 && gridX < project.width && gridY >= 0 && gridY < project.height) {
        return { gridX, gridY, cellIndex: gridY * project.width + gridX };
      }
      return null;
    },
    [scale, offsetX, offsetY, project.width, project.height]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0 || e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setOffset((prev) => prev + dx);
      setOffsetY((prev) => prev + dy);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const coord = getGridCoordsFromEvent(e);
    if (coord) {
      setHoverCoord({ x: coord.gridX, y: coord.gridY });
    } else {
      setHoverCoord(null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // 核心 Canvas 绘制
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const cellSize = BASE_CELL_SIZE * scale;
    const boardWidth = project.width * cellSize;
    const boardHeight = project.height * cellSize;

    const originX = (width - boardWidth) / 2 + offsetX;
    const originY = (height - boardHeight) / 2 + offsetY;

    // 1. 底板阴影与板框
    const boardRim = Math.max(4, Math.round(6 * scale));
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 16 * scale;
    ctx.shadowOffsetY = 4 * scale;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
      originX - boardRim,
      originY - boardRim,
      boardWidth + boardRim * 2,
      boardHeight + boardRim * 2
    );
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      originX - boardRim,
      originY - boardRim,
      boardWidth + boardRim * 2,
      boardHeight + boardRim * 2
    );
    ctx.restore();

    // 2. 绘制每个单元格
    const radius = (cellSize / 2) * 0.88;
    const holeRadius = radius * 0.32;
    const highlightSet = new Set(highlightCells);

    for (let y = 0; y < project.height; y++) {
      for (let x = 0; x < project.width; x++) {
        const idx = y * project.width + x;
        const colorIdx = project.cells[idx];
        const cx = originX + x * cellSize + cellSize / 2;
        const cy = originY + y * cellSize + cellSize / 2;

        if (
          cx + cellSize < 0 ||
          cx - cellSize > width ||
          cy + cellSize < 0 ||
          cy - cellSize > height
        ) {
          continue;
        }

        // 网格线
        if (showGrid) {
          ctx.strokeStyle = '#F1F5F9';
          ctx.lineWidth = 1;
          ctx.strokeRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
        }

        // 空格底孔
        if (colorIdx === -1 || colorIdx === undefined) {
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.5, holeRadius * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = '#CBD5E1';
          ctx.fill();
          continue;
        }

        const color = palette[colorIdx];
        if (!color) continue;

        const isDimmed = highlightColorIndex !== null && highlightColorIndex !== colorIdx;
        const isHighlightIsland = highlightSet.has(idx);

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.2;
        }

        if (viewMode === 'grid') {
          // 制作图纸视图 (扁平圆 + 标号)
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = color.hex;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.14)';
          ctx.fill();

          if (showLabels && cellSize >= 16) {
            const isLight =
              (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000 > 135;
            ctx.fillStyle = isLight ? '#1F2937' : '#FFFFFF';
            const fontSize = Math.max(8, Math.min(11, cellSize * 0.38));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.code, cx, cy);
          }
        } else {
          // 成品效果视图 (立体颗粒质感 3D 弧光)
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = color.hex;
          ctx.fill();

          // 外圈柔和暗边
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
          ctx.lineWidth = Math.max(1, cellSize * 0.05);
          ctx.stroke();

          // 高光弧
          ctx.beginPath();
          ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fill();

          // 中心穿孔
          ctx.beginPath();
          ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fill();

          if (showLabels && cellSize >= 26) {
            const isLight =
              (color.rgb[0] * 299 + color.rgb[1] * 587 + color.rgb[2] * 114) / 1000 > 135;
            ctx.fillStyle = isLight ? 'rgba(31,41,55,0.85)' : 'rgba(255,255,255,0.9)';
            const fontSize = Math.max(8, Math.min(10, cellSize * 0.32));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(color.code, cx, cy);
          }
        }

        ctx.restore();

        // 孤岛警示
        if (isHighlightIsland) {
          ctx.save();
          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 2;
          ctx.strokeRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
          ctx.restore();
        }
      }
    }

    // 3. 悬停提示框
    if (hoverCoord) {
      const hx = originX + hoverCoord.x * cellSize;
      const hy = originY + hoverCoord.y * cellSize;
      ctx.strokeStyle = '#E76F51';
      ctx.lineWidth = 2;
      ctx.strokeRect(hx, hy, cellSize, cellSize);
    }
  }, [
    project,
    palette,
    viewMode,
    showGrid,
    showLabels,
    scale,
    offsetX,
    offsetY,
    highlightColorIndex,
    highlightCells,
    hoverCoord,
  ]);

  // 自适应容器尺寸
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      renderCanvas();
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const currentHoverCellIndex =
    hoverCoord ? hoverCoord.y * project.width + hoverCoord.x : null;
  const currentHoverColorIdx =
    currentHoverCellIndex !== null ? project.cells[currentHoverCellIndex] : null;
  const currentHoverColor =
    currentHoverColorIdx !== null && currentHoverColorIdx >= 0
      ? palette[currentHoverColorIdx]
      : null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onSelectImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`relative flex-1 h-full overflow-hidden checkerboard-bg select-none ${
        isSpacePressed || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
    >
      {/* 顶部悬浮控制栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-3">
        {/* 模式切换 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('bead')}
            className={`btn-h-28 px-3 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'bead'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            成品效果
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`btn-h-28 px-3 rounded-md text-xs font-semibold transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            制作图纸
          </button>
        </div>

        <div className="w-px h-4 bg-slate-200" />

        {/* 缩放控制器 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setScale((s) => Math.max(0.3, s - 0.15))}
            title="缩小"
            className="btn-h-28 px-2 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="重置缩放 (100%)"
            className="btn-h-28 px-2 text-xs font-semibold text-slate-700 hover:bg-white rounded transition-colors font-mono"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={() => setScale((s) => Math.min(3.5, s + 0.15))}
            title="放大"
            className="btn-h-28 px-2 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="还原居中"
            className="btn-h-28 px-1.5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <div className="w-px h-4 bg-slate-200" />

        {/* 辅助开关 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="显示/隐藏网格"
            className={`btn-h-28 px-2.5 rounded-md flex items-center gap-1 text-xs font-medium transition-colors ${
              showGrid ? 'bg-white text-orange-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>网格</span>
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            title="显示/隐藏色号"
            className={`btn-h-28 px-2.5 rounded-md flex items-center gap-1 text-xs font-medium transition-colors ${
              showLabels ? 'bg-white text-orange-600 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>色号</span>
          </button>
        </div>
      </div>

      {/* 计算中遮罩 */}
      {isProcessing && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-xs text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium animate-pulse">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>正在实时重新量化中...</span>
        </div>
      )}

      {/* 主 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full block"
      />

      {/* 空状态：尚未上传图片时引导卡片 */}
      {!sourceImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 border border-slate-200 shadow-xl max-w-md text-center pointer-events-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <span className="font-bold text-slate-800 text-lg mb-2 block">
              拖入或上传任意图片
            </span>
            <span className="text-xs text-slate-500 mb-6 leading-relaxed block">
              自动对齐实体拼豆色号、去除背景与计算颗粒材料。无需看教程，1秒生成可制作图纸。
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-h-40 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all"
            >
              选择本地图片开始
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onSelectImage(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* 悬停坐标与颜色状态指示 */}
      {hoverCoord && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-3 text-xs text-slate-700 pointer-events-none z-10">
          <span className="font-mono text-slate-500">
            X:{hoverCoord.x + 1} Y:{hoverCoord.y + 1}
          </span>
          {currentHoverColor ? (
            <div className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shrink-0"
                style={{ backgroundColor: currentHoverColor.hex }}
              />
              <span className="font-bold text-slate-800">{currentHoverColor.code}</span>
              <span className="text-slate-500 font-medium">({currentHoverColor.name})</span>
            </div>
          ) : (
            <span className="text-slate-400">底板空格</span>
          )}
        </div>
      )}
    </div>
  );
};

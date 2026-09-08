'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

const BASE_CELL_SIZE = 28;

export const EditorCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    project,
    palette,
    activeTool,
    activeColorIndex,
    viewMode,
    showGrid,
    showLabels,
    scale,
    offsetX,
    offsetY,
    setScale,
    setOffset,
    setCellsBatch,
    floodFill,
    setActiveColorIndex,
    setActiveTool,
    highlightColorIndex,
    highlightCells,
    undo,
    redo,
  } = useEditorStore();

  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const lastPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDrawnCell = useRef<number | null>(null);
  const strokeChanges = useRef<Map<number, number>>(new Map());

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在 input 输入时触发快捷键
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'i' || e.key === 'I') {
        setActiveTool('picker');
      } else if (e.key === 'g' || e.key === 'G') {
        setActiveTool('fill');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
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
  }, [setActiveTool, undo, redo]);

  // 将屏幕坐标转换为画布网格坐标 (x, y)
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

  // 鼠标滚轮缩放
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setScale((prev) => Math.min(3.5, Math.max(0.3, prev * zoomFactor)));
  };

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || isSpacePressed) {
      // 中键或按住空格拖拽平移
      setIsPanning(true);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      const coord = getGridCoordsFromEvent(e);
      if (!coord) return;

      const { cellIndex } = coord;

      if (activeTool === 'picker') {
        const colorIdx = project.cells[cellIndex];
        if (colorIdx >= 0) {
          setActiveColorIndex(colorIdx);
          setActiveTool('brush');
        }
        return;
      }

      if (activeTool === 'fill') {
        floodFill(cellIndex, activeColorIndex);
        return;
      }

      // 画笔与橡皮擦开始涂色
      setIsDrawing(true);
      strokeChanges.current.clear();
      const targetColor = activeTool === 'brush' ? activeColorIndex : -1;
      strokeChanges.current.set(cellIndex, targetColor);
      lastDrawnCell.current = cellIndex;
      setCellsBatch([{ index: cellIndex, colorIndex: targetColor }]);
    }
  };

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      setOffset(offsetX + dx, offsetY + dy);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const coord = getGridCoordsFromEvent(e);
    if (coord) {
      setHoverCoord({ x: coord.gridX, y: coord.gridY });
    } else {
      setHoverCoord(null);
    }

    if (isDrawing && coord) {
      const { cellIndex } = coord;
      if (lastDrawnCell.current !== cellIndex) {
        lastDrawnCell.current = cellIndex;
        const targetColor = activeTool === 'brush' ? activeColorIndex : -1;
        strokeChanges.current.set(cellIndex, targetColor);
        setCellsBatch([{ index: cellIndex, colorIndex: targetColor }], false);
      }
    }
  };

  // 鼠标释放
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDrawing(false);
    lastDrawnCell.current = null;
    strokeChanges.current.clear();
  };

  // 核心绘制循环
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空背景
    ctx.clearRect(0, 0, width, height);

    const cellSize = BASE_CELL_SIZE * scale;
    const boardWidth = project.width * cellSize;
    const boardHeight = project.height * cellSize;

    const originX = (width - boardWidth) / 2 + offsetX;
    const originY = (height - boardHeight) / 2 + offsetY;

    // 1. 绘制拼豆底板（亚克力透明板质感带圆角与轻微阴影）
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 16 * scale;
    ctx.shadowOffsetY = 4 * scale;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(originX, originY, boardWidth, boardHeight);
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

        // 视口剔除：若不在可视窗口内则跳过
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

        // 空格底板凹孔
        if (colorIdx === -1) {
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1.5, holeRadius * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = '#CBD5E1';
          ctx.fill();
          continue;
        }

        const color = palette[colorIdx];
        if (!color) continue;

        // 高亮模式变暗未选中色
        const isDimmed =
          highlightColorIndex !== null && highlightColorIndex !== colorIdx;
        const isHighlightIsland = highlightSet.has(idx);

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.2;
        }

        if (viewMode === 'pixel') {
          // 纯像素模式
          ctx.fillStyle = color.hex;
          ctx.fillRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
        } else if (viewMode === 'grid') {
          // 图纸网格模式
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = color.hex;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fill();

          // 标注色号
          if (showLabels && cellSize >= 18) {
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
          // 拼豆质感模式 (3D 圆颗粒 + 弧形高光 + 凹孔阴影)
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

          // 质感模式下放大足够时也显示色号
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

        // 孤岛警示边框
        if (isHighlightIsland) {
          ctx.save();
          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 2;
          ctx.strokeRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
          ctx.restore();
        }
      }
    }

    // 3. 悬停方框反馈
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

  // 处理窗口大小变化自适应
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

  // 依赖变化触发重新绘制
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // 当前鼠标所在单元格颜色信息
  const currentHoverCellIndex =
    hoverCoord ? hoverCoord.y * project.width + hoverCoord.x : null;
  const currentHoverColorIdx =
    currentHoverCellIndex !== null ? project.cells[currentHoverCellIndex] : null;
  const currentHoverColor =
    currentHoverColorIdx !== null && currentHoverColorIdx >= 0
      ? palette[currentHoverColorIdx]
      : null;

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 h-full overflow-hidden checkerboard-bg select-none ${
        isSpacePressed || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full block"
      />

      {/* 底部悬停坐标与颜色指示器 */}
      {hoverCoord && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-3 text-xs text-slate-700 pointer-events-none">
          <span className="font-mono">
            X: {hoverCoord.x + 1} Y: {hoverCoord.y + 1}
          </span>
          {currentHoverColor ? (
            <div className="flex items-center gap-1.5">
              <span
                className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block"
                style={{ backgroundColor: currentHoverColor.hex }}
              />
              <span className="font-bold">{currentHoverColor.code}</span>
              <span className="text-slate-500">({currentHoverColor.name})</span>
            </div>
          ) : (
            <span className="text-slate-400">空白格</span>
          )}
        </div>
      )}
    </div>
  );
};

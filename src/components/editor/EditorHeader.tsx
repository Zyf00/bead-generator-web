'use client';

import React from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Tag,
  Download,
  Upload,
  Sliders,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { CanvasViewMode } from '../../lib/types';

interface EditorHeaderProps {
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onOpenImport,
  onOpenExport,
}) => {
  const {
    project,
    setProjectName,
    setWorkspaceMode,
    undo,
    redo,
    history,
    redoStack,
    scale,
    setScale,
    setOffset,
    viewMode,
    setViewMode,
    showGrid,
    setShowGrid,
    showLabels,
    setShowLabels,
  } = useEditorStore();

  const handleResetZoom = () => {
    setScale(1);
    setOffset(0, 0);
  };

  const handleBackToGenerator = () => {
    if (history.length > 0) {
      if (
        window.confirm(
          '返回生成工作台重新调整参数可能会覆盖当前精细画布上的手工修改。确定要返回吗？'
        )
      ) {
        setWorkspaceMode('generate');
      }
    } else {
      setWorkspaceMode('generate');
    }
  };

  return (
    <header className="header-bar-h w-full bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10 select-none">
      {/* 左侧：Logo 与作品名 */}
      <div className="flex items-center gap-3">
        {/* 品牌 Logo 与回首页入口 */}
        <Link
          href="/"
          title="返回首页"
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
        >
          {/* 最新透明底无黑描边拼豆 Logo */}
          <NextImage
            src="/brand/logo-v2.png"
            alt="拼豆生成器 Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            priority
          />
          <span className="font-bold text-slate-800 text-base tracking-tight">
            拼豆生成器
          </span>
        </Link>

        <span className="text-slate-300 text-sm">|</span>

        {/* 作品名称编辑框 */}
        <input
          type="text"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="btn-h-32 px-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-orange-400 rounded-md outline-none transition-colors w-40 sm:w-56"
          placeholder="未命名作品"
        />
      </div>

      {/* 中间：撤销重做、缩放、视图模式 */}
      <div className="flex items-center gap-2">
        {/* 撤销 / 重做 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={undo}
            disabled={history.length === 0}
            title="撤销 (Ctrl+Z)"
            className="btn-h-28 px-2.5 rounded flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">撤销</span>
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="重做 (Ctrl+Y)"
            className="btn-h-28 px-2.5 rounded flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">重做</span>
          </button>
        </div>

        {/* 画布缩放 */}
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
            className="btn-h-28 px-2 text-xs font-medium text-slate-700 hover:bg-white rounded transition-colors"
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

        {/* 视图模式切换 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {(['bead', 'grid', 'pixel'] as CanvasViewMode[]).map((mode) => {
            const labels: Record<CanvasViewMode, string> = {
              bead: '颗粒质感',
              grid: '图纸网格',
              pixel: '纯像素',
            };
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`btn-h-28 px-2.5 rounded text-xs transition-colors ${
                  active
                    ? 'bg-white font-semibold text-orange-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {/* 辅助网格 & 色号显示 */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="显示/隐藏网格"
            className={`btn-h-28 px-2 rounded flex items-center gap-1 text-xs transition-colors ${
              showGrid ? 'bg-white text-orange-600 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">网格</span>
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            title="显示/隐藏色号编码"
            className={`btn-h-28 px-2 rounded flex items-center gap-1 text-xs transition-colors ${
              showLabels ? 'bg-white text-orange-600 shadow-xs font-medium' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">色号</span>
          </button>
        </div>
      </div>

      {/* 右侧：返回生成、导入图片与导出图纸 */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleBackToGenerator}
          className="btn-h-36 px-3 rounded-lg border border-orange-200 hover:border-orange-300 bg-orange-50/80 hover:bg-orange-100 text-orange-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <Sliders className="w-3.5 h-3.5 text-orange-600" />
          <span>返回生成参数</span>
        </button>

        <button
          onClick={onOpenImport}
          className="btn-h-36 px-3 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <Upload className="w-4 h-4 text-slate-500" />
          <span>导入图片</span>
        </button>

        <button
          onClick={onOpenExport}
          className="btn-h-36 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>导出图纸与清单</span>
        </button>
      </div>
    </header>
  );
};

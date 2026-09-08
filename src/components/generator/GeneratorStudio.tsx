'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Download,
  Paintbrush,
  RefreshCw,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { GeneratorConfigPanel } from './GeneratorConfigPanel';
import { GeneratorPreview } from './GeneratorPreview';
import { GeneratorSummarySidebar } from './GeneratorSummarySidebar';
import { ExportModal } from '../editor/ExportModal';
import { quantizeImageToGrid } from '../../lib/quantize/quantizeEngine';
import { parseBeadProjectFile } from '../../lib/export/exportProject';

export const GeneratorStudio: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    project,
    palette,
    sourceImage,
    generationOptions,
    setSourceImage,
    setWorkspaceMode,
    setProjectName,
    loadProject,
    applyGeneratedCells,
  } = useEditorStore();

  // 运行量化生成算法
  const runQuantization = useCallback(async () => {
    if (!sourceImage) return;

    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceImage;
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth !== 0) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = reject;
        }
      });

      const result = quantizeImageToGrid(
        img,
        generationOptions,
        palette,
        img.naturalWidth,
        img.naturalHeight
      );

      applyGeneratedCells(result.cells, generationOptions.width, generationOptions.height);
    } catch (err) {
      console.error('生成量化失败', err);
    } finally {
      setIsProcessing(false);
    }
  }, [sourceImage, generationOptions, palette, applyGeneratedCells]);

  // 当源图或生成参数改变时，防抖执行量化
  useEffect(() => {
    if (!sourceImage) return;
    const timer = setTimeout(() => {
      runQuantization();
    }, 220);
    return () => clearTimeout(timer);
  }, [sourceImage, generationOptions, runQuantization]);

  // 处理文件拖入或选中
  const handleSelectFile = (file: File) => {
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
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const file = e.target.files[0];
        const loadedProject = await parseBeadProjectFile(file);
        loadProject(loadedProject);
        setWorkspaceMode('edit');
      } catch (err) {
        console.error('导入工程失败', err);
        alert('导入工程文件失败，请确认文件是否为有效 .bead 格式');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 select-none">
      {/* 顶部导航栏 */}
      <header className="header-bar-h w-full bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="返回首页"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              <span className="leading-none">豆</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-sm md:text-base">拼豆生成器</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                工作台
              </span>
            </div>
          </div>

          <span className="text-slate-300">|</span>

          {/* 作品名称 */}
          <input
            type="text"
            value={project.name}
            onChange={(e) => setProjectName(e.target.value)}
            className="btn-h-32 px-2.5 text-xs md:text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-orange-400 rounded-lg outline-none transition-colors w-36 sm:w-52"
            placeholder="未命名图纸"
          />
        </div>

        {/* 顶部右侧辅助操作 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-h-32 px-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">打开工程</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bead,.json"
            onChange={handleImportProject}
            className="hidden"
          />
        </div>
      </header>

      {/* 中间三栏工作区 */}
      <main className="flex-1 flex flex-row overflow-hidden relative">
        <GeneratorConfigPanel
          isProcessing={isProcessing}
        />
        <GeneratorPreview
          onSelectImage={handleSelectFile}
          isProcessing={isProcessing}
        />
        <GeneratorSummarySidebar />
      </main>

      {/* 底部主行动条 */}
      <footer className="header-bar-h w-full bg-white border-t border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
        {/* 左侧状态简述 */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold text-slate-700">
              当前规格: {project.width}×{project.height} 网格 ({project.beadSize})
            </span>
          </div>
          <span className="text-slate-300 hidden md:inline">|</span>
          <span className="hidden md:inline">
            已开启自动实时图纸渲染
          </span>
        </div>

        {/* 右侧关键主按钮组 */}
        <div className="flex items-center gap-3">
          <button
            onClick={runQuantization}
            disabled={!sourceImage || isProcessing}
            className="btn-h-36 px-3.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>重新计算</span>
          </button>

          {/* 进入精修微调 */}
          <button
            onClick={() => setWorkspaceMode('edit')}
            className="btn-h-36 px-4 rounded-lg border border-orange-200 hover:border-orange-300 bg-orange-50 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Paintbrush className="w-3.5 h-3.5 text-orange-600" />
            <span>进入精细编辑 (画笔微调)</span>
          </button>

          {/* 导出图纸 (主推) */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="btn-h-36 px-5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>导出图纸与清单 (PDF/PNG/CSV)</span>
          </button>
        </div>
      </footer>

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};

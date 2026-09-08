'use client';

import React, { useState } from 'react';
import {
  Download,
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Save,
  Printer,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { exportFinishedImage, exportPatternSheetImage } from '../../lib/export/exportImage';
import { exportBeadListToCsv } from '../../lib/export/exportCsv';
import { exportToPdf } from '../../lib/export/exportPdf';
import { exportBeadProjectFile } from '../../lib/export/exportProject';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project, palette, getBeadCounts } = useEditorStore();
  const { items, totalCount } = getBeadCounts();

  const [isPhysicalPdf, setIsPhysicalPdf] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen) return null;

  const handleExportFinishedPng = () => {
    exportFinishedImage(project.cells, project.width, project.height, palette, project.name);
  };

  const handleExportPatternPng = () => {
    exportPatternSheetImage(project.cells, project.width, project.height, palette, project.name);
  };

  const handleExportCsv = () => {
    exportBeadListToCsv(project.name, items, totalCount);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportToPdf({
        projectName: project.name,
        cells: project.cells,
        width: project.width,
        height: project.height,
        palette,
        items,
        totalCount,
        beadSize: project.beadSize,
        isPhysicalScale: isPhysicalPdf,
      });
    } catch (err) {
      console.error('导出 PDF 失败', err);
      alert('导出 PDF 失败，请检查浏览器权限');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportProject = () => {
    exportBeadProjectFile(project);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="header-bar-h px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-600" />
            <span className="font-bold text-slate-800 text-base">导出图纸与材料清单</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 选项列表 */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* 1. PDF 制作图纸（主推） */}
          <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50/40 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>A4 打印图纸与采购清单 (PDF)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-orange-600 text-white font-bold">
                      推荐
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    包含高清制作图纸 + 色号对应表 + 颗粒用量清单
                  </div>
                </div>
              </div>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="btn-h-36 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                {isExportingPdf ? '正在生成...' : '立即下载 PDF'}
              </button>
            </div>

            {/* 1:1 实物比例选项 */}
            <label className="flex items-center gap-2 mt-1 cursor-pointer select-none bg-white p-2.5 rounded-lg border border-orange-100">
              <input
                type="checkbox"
                checked={isPhysicalPdf}
                onChange={(e) => setIsPhysicalPdf(e.target.checked)}
                className="w-4 h-4 accent-orange-600 rounded"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">
                  开启 1:1 实体比例打印（当前规格: {project.beadSize}）
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  打印后可把透明拼板直接放在 A4 纸上垫着拼，孔位严丝合缝无需数格。
                </span>
              </div>
            </label>
          </div>

          {/* 2. 图片导出 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">成品高清预览图 (PNG)</span>
                </div>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  逼真颗粒质感，适合小红书/朋友圈分享。
                </span>
              </div>
              <button
                onClick={handleExportFinishedPng}
                className="btn-h-32 mt-3 w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
              >
                下载 PNG 预览
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">标号制作图纸 (PNG)</span>
                </div>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  带行列坐标标尺与每颗色号代码。
                </span>
              </div>
              <button
                onClick={handleExportPatternPng}
                className="btn-h-32 mt-3 w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
              >
                下载图纸图片
              </button>
            </div>
          </div>

          {/* 3. CSV 清单与工程文件 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">材料清单表格 (CSV)</span>
                </div>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  可在 Excel / WPS 中打开，方便采购与盘点。
                </span>
              </div>
              <button
                onClick={handleExportCsv}
                className="btn-h-32 mt-3 w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
              >
                下载 CSV 清单
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Save className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800">本地工程文件 (.bead)</span>
                </div>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  保留当前网格、色卡与编辑进度，随时导入继续。
                </span>
              </div>
              <button
                onClick={handleExportProject}
                className="btn-h-32 mt-3 w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
              >
                导出 .bead 工程
              </button>
            </div>
          </div>
        </div>

        {/* 底部关闭 */}
        <div className="header-bar-h px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="btn-h-36 px-5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

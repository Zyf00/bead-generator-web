'use client';

import React from 'react';
import {
  ListOrdered,
  Download,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Wand2,
  Clock,
  Grid,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { exportBeadListToCsv } from '../../lib/export/exportCsv';

export const GeneratorSummarySidebar: React.FC = () => {
  const {
    project,
    activeColorIndex,
    setActiveColorIndex,
    highlightColorIndex,
    setHighlightColorIndex,
    getBeadCounts,
    findIslandCells,
    highlightCells,
    setHighlightCells,
    setCellsBatch,
  } = useEditorStore();

  const { items: beadItems, totalCount } = getBeadCounts();

  // 计算成品真实长宽与拼板数量
  const pitchCm = project.beadSize === '2.6mm' ? 0.26 : 0.5;
  const realWidthCm = (project.width * pitchCm).toFixed(1);
  const realHeightCm = (project.height * pitchCm).toFixed(1);
  const boardsNeeded = Math.ceil(project.width / 29) * Math.ceil(project.height / 29);

  // 制作耗时估算
  const estimateMinutes = Math.max(10, Math.round(totalCount * 0.12));
  const estimateTimeString =
    estimateMinutes > 60
      ? `约 ${(estimateMinutes / 60).toFixed(1)} 小时`
      : `约 ${estimateMinutes} 分钟`;

  // 孤岛检测
  const islandCells = findIslandCells();

  const handleHighlightIslands = () => {
    if (highlightCells.length > 0) {
      setHighlightCells([]);
    } else {
      setHighlightCells(islandCells);
    }
  };

  const handleAutoFixIslands = () => {
    if (islandCells.length === 0) return;
    const { width, cells } = project;
    const updates: { index: number; colorIndex: number }[] = [];
    const neighbors = [-1, 1, -width, width];

    for (const idx of islandCells) {
      const neighborColors = new Map<number, number>();
      for (const off of neighbors) {
        const nIdx = idx + off;
        const nx = nIdx % width;
        const ny = Math.floor(nIdx / width);
        const x = idx % width;
        const y = Math.floor(idx / width);
        if (Math.abs(nx - x) + Math.abs(ny - y) === 1 && nIdx >= 0 && nIdx < cells.length) {
          const c = cells[nIdx];
          if (c !== -1) {
            neighborColors.set(c, (neighborColors.get(c) || 0) + 1);
          }
        }
      }
      if (neighborColors.size > 0) {
        let maxColor = cells[idx];
        let maxCount = 0;
        for (const [col, cnt] of Array.from(neighborColors.entries())) {
          if (cnt > maxCount) {
            maxCount = cnt;
            maxColor = col;
          }
        }
        updates.push({ index: idx, colorIndex: maxColor });
      }
    }

    setCellsBatch(updates);
    setHighlightCells([]);
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full select-none z-10">
      {/* 顶部标题与快速导出 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
          <ListOrdered className="w-4 h-4 text-orange-600" />
          <span>制作数据与材料清单</span>
        </div>
        <button
          onClick={() => exportBeadListToCsv(project.name, beadItems, totalCount)}
          title="导出材料采购 CSV 表格"
          className="btn-h-24 px-2 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
        >
          <Download className="w-3 h-3 text-slate-500" />
          <span>导出 CSV</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* 1. 核心制作指标卡片 */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>实物制作指标</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
            <div className="bg-white p-2 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium">总用豆量</span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">
                {totalCount} <span className="text-xs font-normal text-slate-500">颗</span>
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium">成品物理尺寸</span>
              <span className="text-base font-bold text-slate-800 block mt-0.5">
                {realWidthCm}×{realHeightCm} <span className="text-xs font-normal text-slate-500">cm</span>
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <Grid className="w-3 h-3" />
                <span>所需拼板</span>
              </span>
              <span className="text-xs font-bold text-slate-800 block mt-1">
                {boardsNeeded} 块标准板
              </span>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-200/70">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>预估耗时</span>
              </span>
              <span className="text-xs font-bold text-slate-800 block mt-1">
                {estimateTimeString}
              </span>
            </div>
          </div>
        </div>

        {/* 2. 实体拼装可拼性风险提示 */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>结构稳定性检测</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                islandCells.length === 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {islandCells.length === 0 ? '结构坚固' : `有 ${islandCells.length} 处孤岛`}
            </span>
          </div>

          <span className="text-[11px] text-slate-500 leading-relaxed block">
            {islandCells.length === 0
              ? '所有豆子均有相邻连接支撑，熨烫后不易脆裂脱落。'
              : '检测到孤立单颗豆子，熨烫容易松散，建议一键吸附修复。'}
          </span>

          {islandCells.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleHighlightIslands}
                className="btn-h-28 flex-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-semibold flex items-center justify-center gap-1 text-slate-700 transition-colors text-[11px]"
              >
                <Eye className="w-3 h-3" />
                <span>{highlightCells.length > 0 ? '清除高亮' : '在图纸高亮'}</span>
              </button>
              <button
                onClick={handleAutoFixIslands}
                className="btn-h-28 flex-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center justify-center gap-1 transition-colors text-[11px]"
              >
                <Wand2 className="w-3 h-3" />
                <span>一键智能吸附</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. 材料色号清单 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-800">用色明细</span>
              <span className="text-orange-600 font-bold">({beadItems.length} 色)</span>
            </div>
            {highlightColorIndex !== null && (
              <button
                onClick={() => setHighlightColorIndex(null)}
                className="text-orange-600 hover:underline font-semibold text-[11px]"
              >
                取消高亮
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-1">
            {beadItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <span>暂无材料数据</span>
              </div>
            ) : (
              beadItems.map((item, idx) => {
                const isSelected = activeColorIndex === item.colorIndex;
                const isHighlighted = highlightColorIndex === item.colorIndex;
                return (
                  <div
                    key={item.color.id}
                    onClick={() => {
                      setActiveColorIndex(item.colorIndex);
                      setHighlightColorIndex(isHighlighted ? null : item.colorIndex);
                    }}
                    className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50/90 border border-orange-200'
                        : isHighlighted
                        ? 'bg-amber-50 border border-amber-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-slate-400 w-3.5 text-center font-mono">
                        {idx + 1}
                      </span>
                      <div
                        className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.color.hex }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{item.color.code}</span>
                          <span className="text-slate-600 text-[11px]">{item.color.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.color.hex}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">
                        {item.count} 颗
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

'use client';

import React, { useState } from 'react';
import {
  Settings,
  ListOrdered,
  Sparkles,
  AlertTriangle,
  Download,
  Eye,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { exportBeadListToCsv } from '../../lib/export/exportCsv';

type SidebarTab = 'settings' | 'materials' | 'usability';

export const EditorSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('materials');
  const [customW, setCustomW] = useState('29');
  const [customH, setCustomH] = useState('29');

  const {
    project,
    palette,
    activeColorIndex,
    setActiveColorIndex,
    highlightColorIndex,
    setHighlightColorIndex,
    setBeadSize,
    resizeGrid,
    getBeadCounts,
    findIslandCells,
    highlightCells,
    setHighlightCells,
    setCellsBatch,
  } = useEditorStore();

  const { items: beadItems, totalCount } = getBeadCounts();

  // 计算成品真实长宽
  const pitchCm = project.beadSize === '2.6mm' ? 0.26 : 0.5;
  const realWidthCm = (project.width * pitchCm).toFixed(1);
  const realHeightCm = (project.height * pitchCm).toFixed(1);

  // 估算制作耗时
  const estimateMinutes = Math.max(10, Math.round(totalCount * 0.12));
  const estimateTimeString =
    estimateMinutes > 60
      ? `约 ${(estimateMinutes / 60).toFixed(1)} 小时`
      : `约 ${estimateMinutes} 分钟`;

  // 难度评级
  const difficulty =
    totalCount < 400 ? '简单 (适合新手)' : totalCount < 1200 ? '中等 (入门进阶)' : '挑战 (大图制作)';

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

  const handleApplyCustomSize = () => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (!isNaN(w) && !isNaN(h) && w >= 10 && w <= 120 && h >= 10 && h <= 120) {
      resizeGrid(w, h);
    } else {
      alert('请输入 10 ~ 120 之间的有效网格尺寸');
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full select-none z-10">
      {/* 顶部 Tab 切换 */}
      <div className="flex items-center border-b border-slate-200 px-2 pt-2 bg-slate-50/70">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 btn-h-36 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
            activeTab === 'materials'
              ? 'bg-white text-orange-600 border-slate-200 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>材料用量 ({beadItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 btn-h-36 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x ${
            activeTab === 'settings'
              ? 'bg-white text-orange-600 border-slate-200 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>尺寸与规格</span>
        </button>

        <button
          onClick={() => setActiveTab('usability')}
          className={`flex-1 btn-h-36 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x relative ${
            activeTab === 'usability'
              ? 'bg-white text-orange-600 border-slate-200 shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>可拼性</span>
          {islandCells.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
          )}
        </button>
      </div>

      {/* Tab 1: 材料清单 */}
      {activeTab === 'materials' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* 数据概览卡片 */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">已用豆子: </span>
              <span className="font-bold text-slate-800 text-sm">{totalCount} 颗</span>
            </div>
            <div>
              <span className="text-slate-500">使用色数: </span>
              <span className="font-bold text-slate-800 text-sm">{beadItems.length} 色</span>
            </div>
            <button
              onClick={() => exportBeadListToCsv(project.name, beadItems, totalCount)}
              title="导出材料清单 CSV"
              className="btn-h-28 px-2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 text-[11px] font-medium transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>

          {highlightColorIndex !== null && (
            <div className="bg-orange-50 border-b border-orange-100 px-3 py-1.5 flex items-center justify-between text-xs text-orange-800">
              <span>正在高亮显示: {palette[highlightColorIndex]?.code}</span>
              <button
                onClick={() => setHighlightColorIndex(null)}
                className="text-orange-600 hover:underline font-medium text-[11px]"
              >
                取消高亮
              </button>
            </div>
          )}

          {/* 颜色列表 */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
            {beadItems.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>画布还是空的，快开始创作吧</span>
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
                        ? 'bg-orange-50/80 border border-orange-200'
                        : isHighlighted
                        ? 'bg-amber-50 border border-amber-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-slate-400 w-4 text-center font-mono">
                        {idx + 1}
                      </span>
                      <div
                        className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs flex items-center justify-center"
                        style={{ backgroundColor: item.color.hex }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">
                            {item.color.code}
                          </span>
                          <span className="text-xs text-slate-600">{item.color.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.color.hex}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 block">
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
      )}

      {/* Tab 2: 尺寸与规格 */}
      {activeTab === 'settings' && (
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 text-xs text-slate-700">
          {/* 拼豆物理规格 */}
          <div>
            <label className="font-bold text-slate-800 mb-2 block">
              拼豆规格（影响实物尺寸与打印）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBeadSize('2.6mm')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  project.beadSize === '2.6mm'
                    ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-800">2.6mm 迷你豆</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  适合钥匙扣、挂件、立牌，精致细腻
                </div>
              </button>

              <button
                onClick={() => setBeadSize('5.0mm')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  project.beadSize === '5.0mm'
                    ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-slate-800">5.0mm 标准豆</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  适合杯垫、大摆件、亲子手作，易拿取
                </div>
              </button>
            </div>
          </div>

          {/* 网格尺寸预设 */}
          <div>
            <label className="font-bold text-slate-800 mb-2 block">
              网格尺寸（方形拼板标准）
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => resizeGrid(29, 29)}
                className={`btn-h-36 rounded-lg border text-center font-medium transition-all ${
                  project.width === 29 && project.height === 29
                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                29 × 29 (标准小方板)
              </button>
              <button
                onClick={() => resizeGrid(58, 58)}
                className={`btn-h-36 rounded-lg border text-center font-medium transition-all ${
                  project.width === 58 && project.height === 58
                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                58 × 58 (4拼板拼接)
              </button>
            </div>

            {/* 自定义宽高 */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="10"
                max="120"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                placeholder="宽"
                className="btn-h-32 w-16 px-2 border border-slate-200 rounded text-center outline-none focus:border-orange-500"
              />
              <span className="text-slate-400">×</span>
              <input
                type="number"
                min="10"
                max="120"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                placeholder="高"
                className="btn-h-32 w-16 px-2 border border-slate-200 rounded text-center outline-none focus:border-orange-500"
              />
              <button
                onClick={handleApplyCustomSize}
                className="btn-h-32 px-3 bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700 transition-colors"
              >
                设定尺寸
              </button>
            </div>
          </div>

          {/* 实物制作预估卡片 */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2">
            <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>制作预期指标</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">成品物理尺寸:</span>
              <span className="font-bold text-slate-800">
                {realWidthCm} × {realHeightCm} cm
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">制作难度:</span>
              <span className="font-bold text-slate-800">{difficulty}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">预计耗时:</span>
              <span className="font-bold text-slate-800">{estimateTimeString}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 可拼性检测 */}
      {activeTab === 'usability' && (
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-slate-800 text-sm">实体拼装友好度检测</span>
          </div>

          {/* 孤岛豆子检测 */}
          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>单颗孤岛检测</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  islandCells.length === 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {islandCells.length === 0 ? '结构坚固' : `存在 ${islandCells.length} 处孤岛`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              孤立单颗豆子四周没有同色固定，在熨烫后容易断裂脱落，手作时也很难固定。
            </p>

            {islandCells.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleHighlightIslands}
                  className="btn-h-28 flex-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-medium flex items-center justify-center gap-1 text-slate-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {highlightCells.length > 0 ? '清除高亮' : '在画布高亮'}
                  </span>
                </button>
                <button
                  onClick={handleAutoFixIslands}
                  className="btn-h-28 flex-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>一键智能吸附</span>
                </button>
              </div>
            )}
          </div>

          {/* 色数过密检测 */}
          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col gap-2">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>材料采购便利度</span>
              <span className="text-[11px] text-slate-500">{beadItems.length} 色</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {beadItems.length > 24
                ? '提示：使用的颜色超过 24 种，需要准备较多色号。如果手头豆子库存有限，可考虑使用“容易完成”模式减少色数。'
                : '颜色种类适中（<= 24 色），容易准备材料且制作顺畅。'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};

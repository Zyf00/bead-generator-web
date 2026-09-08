'use client';

import React from 'react';
import {
  Paintbrush,
  Eraser,
  Pipette,
  PaintBucket,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { EditorTool } from '../../lib/types';

export const EditorToolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    activeColorIndex,
    palette,
    clearCanvas,
  } = useEditorStore();

  const currentColor = palette[activeColorIndex] || palette[0];

  const tools: { id: EditorTool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'brush', label: '画笔', icon: <Paintbrush className="w-4 h-4" />, shortcut: 'B' },
    { id: 'eraser', label: '橡皮擦', icon: <Eraser className="w-4 h-4" />, shortcut: 'E' },
    { id: 'picker', label: '吸管', icon: <Pipette className="w-4 h-4" />, shortcut: 'I' },
    { id: 'fill', label: '填充桶', icon: <PaintBucket className="w-4 h-4" />, shortcut: 'G' },
  ];

  const handleClear = () => {
    if (window.confirm('确定要清空当前画布上的所有豆子吗？')) {
      clearCanvas();
    }
  };

  return (
    <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none z-10">
      {/* 工具列表 */}
      <div className="flex flex-col gap-2 w-full px-2">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {t.icon}
              <span className="text-[10px] leading-tight mt-0.5">{t.label}</span>
            </button>
          );
        })}

        <div className="w-8 h-px bg-slate-200 mx-auto my-1" />

        {/* 清空画布 */}
        <button
          onClick={handleClear}
          title="清空画布"
          className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[10px] leading-tight mt-0.5">清空</span>
        </button>
      </div>

      {/* 底部当前颜色状态展示 */}
      <div className="mt-auto flex flex-col items-center gap-1">
        <div className="text-[10px] text-slate-400 font-medium">当前色</div>
        <div
          title={`${currentColor.name} (${currentColor.code}) - ${currentColor.hex}`}
          className="w-8 h-8 rounded-full border-2 border-slate-300 shadow-xs flex items-center justify-center relative transition-transform hover:scale-110 cursor-pointer"
          style={{ backgroundColor: currentColor.hex }}
        >
          <div className="w-2 h-2 rounded-full bg-black/20" />
        </div>
        <span className="text-[11px] font-bold text-slate-700">{currentColor.code}</span>
      </div>
    </aside>
  );
};

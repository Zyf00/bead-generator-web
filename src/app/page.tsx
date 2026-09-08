'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Upload,
  Layers,
  Printer,
  Wand2,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { parseBeadProjectFile } from '../lib/export/exportProject';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadProject, resizeGrid, setBeadSize, setProjectName } = useEditorStore();

  const handleSelectTemplate = (width: number, height: number, size: '2.6mm' | '5.0mm', name: string) => {
    resizeGrid(width, height);
    setBeadSize(size);
    setProjectName(name);
    router.push('/editor');
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const file = e.target.files[0];
        const project = await parseBeadProjectFile(file);
        loadProject(project);
        router.push('/editor');
      } catch (err) {
        console.error('导入工程失败', err);
        alert('导入工程文件失败，请确认文件是否为有效的 .bead 格式');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-800 flex flex-col justify-between select-none">
      {/* 顶部导航 */}
      <header className="header-bar-h w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <span className="leading-none">豆</span>
          </div>
          <span className="font-bold text-slate-800 text-base tracking-wide">
            拼豆生成器
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-h-36 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <FolderOpen className="w-4 h-4 text-slate-500" />
            <span>打开工程 (.bead)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".bead,.json"
            onChange={handleImportProject}
            className="hidden"
          />

          <Link
            href="/editor"
            className="btn-h-36 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>进入编辑器</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 主视觉 Hero 区域 */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>专为手作人打造的真实拼豆图纸工具</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight max-w-3xl mb-6">
          把喜欢的图片，变成一份真正可以完成的拼豆作品
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed mb-10">
          告别普通像素画工具的不匹配问题。自动对齐实体拼豆主流品牌色号、计算真实颗数清单、支持 1:1 透明拼板垫底打印，让每位手作爱好者轻松上手。
        </p>

        {/* 快速起步卡片 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center mb-16">
          <Link
            href="/editor?action=import"
            className="btn-h-40 px-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>导入图片开始创作</span>
          </Link>

          <button
            onClick={() => handleSelectTemplate(29, 29, '2.6mm', '经典挂件')}
            className="btn-h-40 px-6 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-2xs"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>从空白标准拼板开始</span>
          </button>
        </div>

        {/* 常用预设模板卡片 */}
        <div className="w-full text-left mb-16">
          <div className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
            <span>常用手作尺寸模板</span>
            <span className="text-xs font-normal text-slate-400">
              根据实体拼板规格精心预设
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 模板 1 */}
            <div
              onClick={() => handleSelectTemplate(29, 29, '2.6mm', '钥匙扣挂件')}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                    2.6mm 迷你豆
                  </span>
                  <span className="text-xs text-slate-400 font-mono">29 × 29</span>
                </div>
                <div className="font-bold text-slate-800 text-base mb-1">
                  钥匙扣 / 包包挂件
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  成品约 7.5 × 7.5 cm，单块标准拼板，最适合二次元头像、宠物与礼物制作。
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-orange-600 flex items-center gap-1">
                <span>进入创作</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 模板 2 */}
            <div
              onClick={() => handleSelectTemplate(29, 29, '5.0mm', '日常杯垫')}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                    5.0mm 标准豆
                  </span>
                  <span className="text-xs text-slate-400 font-mono">29 × 29</span>
                </div>
                <div className="font-bold text-slate-800 text-base mb-1">
                  桌面杯垫 / 亲子手作
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  成品约 14.5 × 14.5 cm，大颗粒易抓取，不累眼，新手与亲子活动首选。
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-orange-600 flex items-center gap-1">
                <span>进入创作</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* 模板 3 */}
            <div
              onClick={() => handleSelectTemplate(58, 58, '2.6mm', '桌面立牌摆件')}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    4拼板拼接
                  </span>
                  <span className="text-xs text-slate-400 font-mono">58 × 58</span>
                </div>
                <div className="font-bold text-slate-800 text-base mb-1">
                  精细大摆件 / 像素画框
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  成品约 15 × 15 cm（2.6mm）或 29 × 29 cm（5.0mm），细腻还原复杂细节。
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-orange-600 flex items-center gap-1">
                <span>进入创作</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* 核心亮点 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 w-full text-left py-8 border-t border-slate-200/80">
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-800 text-sm mb-1">三套智能方案</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              细节优先、容易完成、复古像素，新手一键挑出满意效果。
            </p>
          </div>

          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-800 text-sm mb-1">真实色号对应</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              对齐 Artkal / Mard / Perler 标准拼豆色表，清单对照直接采购。
            </p>
          </div>

          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
              <Printer className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-800 text-sm mb-1">1:1 垫纸打印</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              将透明拼板直接放在打印图纸上照着拼，孔位严丝合缝无需数格。
            </p>
          </div>

          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-800 text-sm mb-1">纯本地无感存储</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              全部在浏览器本地极速运算，无需登录，保障您的原创图片隐私。
            </p>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="w-full border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        <span>拼豆生成器 © 2026 · 专为拼豆创作者设计</span>
      </footer>
    </div>
  );
}

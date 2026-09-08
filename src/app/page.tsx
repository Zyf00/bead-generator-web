'use client';

import React, { useRef, useState } from 'react';
import NextImage from 'next/image';
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
  CheckCircle,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { parseBeadProjectFile } from '../lib/export/exportProject';

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    loadProject,
    resizeGrid,
    setBeadSize,
    setProjectName,
    setSourceImage,
    setWorkspaceMode,
  } = useEditorStore();

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setSourceImage(dataUrl, { width: img.naturalWidth, height: img.naturalHeight });
        setWorkspaceMode('generate');
        router.push('/editor');
      };
      img.src = dataUrl;
    });
    reader.readAsDataURL(file);
  };

  const handleSelectTemplate = (
    width: number,
    height: number,
    size: '2.6mm' | '5.0mm',
    name: string
  ) => {
    resizeGrid(width, height);
    setBeadSize(size);
    setProjectName(name);
    setWorkspaceMode('generate');
    router.push('/editor');
  };

  const handleCreateBlank = () => {
    resizeGrid(29, 29);
    setBeadSize('2.6mm');
    setProjectName('空白拼板创作');
    setWorkspaceMode('edit');
    router.push('/editor');
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const file = e.target.files[0];
        const project = await parseBeadProjectFile(file);
        loadProject(project);
        setWorkspaceMode('edit');
        router.push('/editor');
      } catch (err) {
        console.error('导入工程失败', err);
        alert('导入工程文件失败，请确认文件是否为有效的 .bead 格式');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-800 flex flex-col justify-between select-none">
      {/* 顶部导航 */}
      <header className="header-bar-h w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-20">
        {/* 品牌 Logo 与回首页入口 */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
        >
          {/* 最新透明底无黑描边拼豆 Logo */}
          <NextImage
            src="/brand/logo-v2.png"
            alt="拼豆生成器 Logo"
            width={32}
            height={32}
            priority
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold text-slate-800 text-base tracking-tight">
            拼豆生成器
          </span>
        </Link>

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
            <span>进入工作台</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 主视觉 Hero 区域 */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 md:py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>上传图片 · 1分钟获取可购买、可拼装的实体拼豆图纸</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight max-w-3xl mb-5">
          把喜欢的图片，变成一份真正可以完成的拼豆作品
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed mb-8">
          无需复杂的像素画绘制技巧。智能映射实体拼豆色号、自动统计颗粒消耗清单、生成 1:1 透明拼板打印垫纸。
        </p>

        {/* 核心主任务：上传图片生成工作台（大尺寸拖拽投放区） */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => imageUploadRef.current?.click()}
          className={`w-full max-w-2xl p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center mb-8 ${
            isDragging
              ? 'border-orange-500 bg-orange-50/70 scale-[1.01]'
              : 'border-orange-300 hover:border-orange-500 bg-white hover:bg-orange-50/30 shadow-md hover:shadow-lg'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 shadow-2xs">
            <Upload className="w-8 h-8" />
          </div>

          <span className="text-lg sm:text-xl font-bold text-slate-800 mb-1">
            上传图片，生成拼豆图纸
          </span>
          <span className="text-xs text-slate-500 mb-5">
            点击选择 或 拖拽图片至此处 (支持 PNG、JPG、JPEG、WebP 格式)
          </span>

          <button
            type="button"
            className="btn-h-44 px-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 pointer-events-none"
          >
            <Sparkles className="w-4 h-4" />
            <span>立即开始生成</span>
          </button>

          <input
            ref={imageUploadRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleImageFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </div>

        {/* 辅助入口 */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 text-xs font-semibold text-slate-600">
          <button
            onClick={handleCreateBlank}
            className="btn-h-36 px-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>从空白标准拼板创作</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-h-36 px-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <FolderOpen className="w-4 h-4 text-slate-500" />
            <span>导入已有工程 (.bead)</span>
          </button>
        </div>

        {/* 交付内容明确：用户最终可得到什么 */}
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 mb-16 text-left shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-800 text-base">
              您最终将获得一份完整的拼豆制作方案：
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">1. 高清标号制作图纸</span>
              <span className="text-slate-500 block leading-relaxed">
                带坐标网格与色号代码，拼装清晰不串色。
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">2. 颗粒材料采购清单</span>
              <span className="text-slate-500 block leading-relaxed">
                精确统计每个色号颗数与占比，支持导出 CSV。
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">3. 1:1 实物垫底打印</span>
              <span className="text-slate-500 block leading-relaxed">
                透明拼板直接放在 A4 纸上垫着拼，孔位严丝合缝。
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">4. 实体拼装安全保证</span>
              <span className="text-slate-500 block leading-relaxed">
                自动检测并吸附孤立单颗，熨烫稳固不易碎。
              </span>
            </div>
          </div>
        </div>

        {/* 常用手作尺寸模板 */}
        <div className="w-full text-left mb-16">
          <div className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
            <span>常用手作尺寸模板</span>
            <span className="text-xs font-normal text-slate-400">
              根据实体拼板规格预设
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <span>快速起步</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

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
                <span>快速起步</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

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
                <span>快速起步</span>
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
            <div className="font-bold text-slate-800 text-sm mb-1">纯本地运算</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              全部在浏览器本地运算，无需登录，保障原创图片隐私。
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

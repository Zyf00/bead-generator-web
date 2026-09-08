# 拼豆生成器 Web

将图片转换为可制作拼豆图纸的 PC Web 工具，支持色彩量化、逐格编辑、材料统计与图纸导出。

## 运行环境

- Node.js：`>= 20.19.0`，项目根目录 `.node-version` 固定为 `20`；
- 包管理器：npm，统一提交 `package-lock.json`；
- 运行 npm 命令前必须先在终端切换至 Node 20。项目会在 `dev`、`build`、`lint`、`test` 等命令执行前进行版本校验。

## 常用命令

```bash
npm run dev
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
npm run build
```

Playwright 默认使用独立的 `3010` 端口和 `.next-e2e` 目录，不会占用日常开发服务的端口或 `.next` 开发锁。

## 测试策略

- Vitest：覆盖拼豆工程文件校验、编辑器状态、洪水填充、网格缩放与 PDF 的 A4 分区计算；
- Playwright：覆盖首页进入编辑器的完整浏览器流程；
- GitHub Actions：在 Node 20.20.2 下执行 lint、单元测试、生产构建与 Chromium 端到端测试；
- 修改核心行为时先增加失败测试，再编写最小实现使测试通过。

## 项目结构

```text
src/app/                 Next.js 页面与布局
src/components/editor/   拼豆编辑器界面
src/lib/                 色卡、量化、导出和本地数据库逻辑
src/store/               Zustand 编辑器状态
tests/e2e/               Playwright 端到端测试
```

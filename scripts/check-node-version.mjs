const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 20 || (major === 20 && minor < 19)) {
  console.error(`当前 Node.js 为 ${process.versions.node}，项目要求 Node.js >= 20.19.0。`);
  console.error('请先切换至 Node 20 后再运行 npm 命令。');
  process.exit(1);
}

import os from 'os';
import { spawn } from 'child_process';

const PORT = process.env.PORT || 3008;

/**
 * 获取当前设备真实活跃的局域网 IPv4 地址
 * 优先匹配物理网卡（如 macOS 上的 en0, en1 等），排除内网环回和虚拟网卡
 */
function getLocalLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    const list = nets[name];
    if (!list) continue;
    for (const net of list) {
      // 仅提取非内部环回的 IPv4
      if (net.family === 'IPv4' && !net.internal) {
        // 排除常见的虚拟网卡/VPN通道
        const lower = name.toLowerCase();
        const isVirtual = lower.startsWith('utun') || lower.startsWith('tun') || lower.startsWith('docker') || lower.startsWith('vbox');
        candidates.push({ name, address: net.address, isPhysical: !isVirtual });
      }
    }
  }

  // 优先挑选物理网卡（如 en0, en1）
  const physical = candidates.find(c => c.isPhysical && (c.name.startsWith('en') || c.name.startsWith('eth') || c.name.startsWith('wlan')));
  if (physical) return physical.address;

  // 兜底返回第一个有效 IP
  return candidates[0]?.address || 'localhost';
}

const lanIp = getLocalLanIp();

// 打印显眼的访问提示卡片
console.log('\n\x1b[36m%s\x1b[0m', '  ============================================================');
console.log('\x1b[33m%s\x1b[0m', '  🎨 拼豆生成器 Web 开发服务');
console.log('  - 本地访问:    \x1b[34mhttp://localhost:' + PORT + '\x1b[0m');
console.log('  - 局域网访问:  \x1b[32mhttp://' + lanIp + ':' + PORT + '\x1b[0m (手机/局域网设备可用)');
console.log('  - 编辑器直达:  \x1b[35mhttp://' + lanIp + ':' + PORT + '/editor\x1b[0m');
console.log('\x1b[36m%s\x1b[0m\n', '  ============================================================');

// 启动 Next.js 开发服务器，监听 0.0.0.0
const child = spawn('npx', ['next', 'dev', '-H', '0.0.0.0', '-p', String(PORT)], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

// 处理退出信号
process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许本机与当前局域网地址访问开发服务器的 HMR WebSocket。
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.8.171'],
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "拼豆生成器 - 图片一键转真实色号拼豆图纸与材料清单",
  description: "专为手作人打造的 PC Web 端拼豆创作工具。支持图片导入裁切、自动色彩量化、真实品牌色号匹配、1:1 实物比例透明拼板打印纸模与逐格精修。",
  keywords: ["拼豆", "拼豆图纸", "拼豆生成器", "Perler Beads", "Artkal", "像素画", "手作DIY", "拼豆色号"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
    ],
    apple: [
      { url: "/brand/logo-v2.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

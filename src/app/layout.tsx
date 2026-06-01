import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '충북match — 충북대학교 스포츠·공모전 매칭 플랫폼',
  description:
    '충북대학교 재학생 전용 스포츠 매치 상대 찾기 & 공모전 팀원 매칭 플랫폼. 종목·수준·역량 기반으로 최적의 파트너를 만나보세요.',
  keywords: '충북대, 스포츠 매칭, 공모전, 팀원 모집, 충북대학교',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}

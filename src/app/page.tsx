import Link from 'next/link';
import {
  Trophy,
  Users,
  MessageCircle,
  Shield,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Star,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ─── Header ────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">CB</span>
              </div>
              <span className="text-xl font-bold text-primary">충북match</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-light transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 text-sm font-semibold text-white bg-accent rounded-full hover:bg-accent-dark transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-48 h-48 bg-success/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-full text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            충북대학교 재학생 전용 매칭 플랫폼
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text leading-tight mb-6 animate-slide-up">
            스포츠 매치 상대부터
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-accent">
              공모전 팀원까지
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            종목·수준·역량 기반으로 최적의 파트너를 찾고,
            <br className="hidden sm:block" />
            실시간 채팅으로 바로 소통하세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link
              href="/signup"
              className="group flex items-center gap-2 px-8 py-4 bg-accent text-white font-semibold rounded-2xl hover:bg-accent-dark transition-all hover:shadow-xl hover:-translate-y-1 animate-pulse-glow"
            >
              지금 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              로그인
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-16 mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {[
              { label: '스포츠 종목', value: '5종목' },
              { label: '충청권 공모전', value: '4개 지역' },
              { label: 'AI 매칭', value: '지원' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-text mb-4">
              왜 <span className="text-primary">충북match</span>인가?
            </h2>
            <p className="text-text-secondary text-lg max-w-xl mx-auto">
              학교 이메일 인증 기반의 신뢰할 수 있는 캠퍼스 매칭
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: '종목·수준 매칭',
                desc: '축구, 풋살, 농구, 테니스, e스포츠 — 초급부터 고수까지 딱 맞는 상대를 찾아드려요.',
                color: 'bg-sport-soccer/10 text-sport-soccer',
              },
              {
                icon: Trophy,
                title: '공모전 팀원 모집',
                desc: '충청권 4개 지역 공모전 정보와 함께 역량 기반 팀원 매칭을 제공합니다.',
                color: 'bg-contest/10 text-contest',
              },
              {
                icon: Sparkles,
                title: 'AI 추천',
                desc: 'Claude AI가 공모전 요약, 매칭 추천 사유를 분석하여 최적의 팀원을 추천합니다.',
                color: 'bg-primary/10 text-primary',
              },
              {
                icon: MessageCircle,
                title: '실시간 채팅',
                desc: '매치 확정 즉시 1:1 채팅방 생성, 공모전 그룹 채팅으로 팀 협업을 시작하세요.',
                color: 'bg-accent/10 text-accent',
              },
              {
                icon: Shield,
                title: '신뢰 기반 커뮤니티',
                desc: '@chungbuk.ac.kr 이메일 인증 + 매너 별점 + 신고 시스템으로 안전하게.',
                color: 'bg-success/10 text-success',
              },
              {
                icon: Zap,
                title: '시설 예약 연동',
                desc: '교내 체육시설 예약 현황을 실시간으로 확인하고 매치글에 바로 연동하세요.',
                color: 'bg-sport-esports/10 text-sport-esports',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sports Section ────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary-50/50 to-bg">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text mb-12">
            다양한 <span className="text-accent">스포츠 종목</span> 지원
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { emoji: '⚽', name: '축구', color: 'border-sport-soccer bg-sport-soccer/5 text-sport-soccer' },
              { emoji: '🥅', name: '풋살', color: 'border-sport-futsal bg-sport-futsal/5 text-sport-futsal' },
              { emoji: '🏀', name: '농구', color: 'border-sport-basketball bg-sport-basketball/5 text-sport-basketball' },
              { emoji: '🎾', name: '테니스', color: 'border-sport-tennis bg-sport-tennis/5 text-sport-tennis' },
              { emoji: '🎮', name: 'e스포츠', color: 'border-sport-esports bg-sport-esports/5 text-sport-esports' },
            ].map((sport) => (
              <div
                key={sport.name}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 ${sport.color} font-semibold text-lg hover:scale-105 transition-transform cursor-default`}
              >
                <span className="text-3xl">{sport.emoji}</span>
                {sport.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-text text-center mb-16">
            이렇게 <span className="text-primary">이용</span>하세요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: '회원가입', desc: '학교 이메일로 인증하고 프로필을 완성하세요', icon: Users },
              { step: '02', title: '매치 탐색', desc: '원하는 종목·수준으로 매치를 찾거나 작성하세요', icon: Target },
              { step: '03', title: '신청·수락', desc: '한 번의 클릭으로 매치를 신청하고 채팅을 시작하세요', icon: MessageCircle },
              { step: '04', title: '매너 평가', desc: '매치 후 상대를 평가하여 건강한 커뮤니티를 만드세요', icon: Star },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <item.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <div className="text-xs font-bold text-accent mb-2">STEP {item.step}</div>
                <h3 className="text-lg font-semibold text-text mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-primary-dark p-12 text-center text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                지금 바로 시작하세요
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                충북대 학생이라면 누구나 무료로 이용할 수 있습니다.
                최적의 파트너를 만나보세요.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-semibold rounded-2xl hover:bg-accent-dark transition-all hover:shadow-xl hover:-translate-y-1"
              >
                회원가입하기
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xs">CB</span>
            </div>
            <span className="text-sm font-semibold text-primary">충북match</span>
          </div>
          <p className="text-sm text-muted">
            © 2026 충북match. 충북대학교 재학생 전용 서비스.
          </p>
        </div>
      </footer>
    </div>
  );
}

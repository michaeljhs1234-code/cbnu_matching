'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { REGIONS, CONTEST_CATEGORIES } from '@/lib/constants';
import { Star, ExternalLink, Calendar, Loader2, Users, Plus, Trophy } from 'lucide-react';
import type { Contest, ContestRegion, ContestCategory } from '@/types';

// 정적 데이터 import
import { staticContests, isExpiredContest } from '@/data/contests';

function ContestCard({
  contest,
  isFavorited,
  onToggleFavorite,
}: {
  contest: Contest;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const region = REGIONS.find((r) => r.value === contest.region);
  const deadline = new Date(contest.deadline);
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="group bg-card rounded-2xl border border-border hover:border-contest/30 hover:shadow-card-hover transition-all duration-300 p-5 animate-fade-in relative">
      {/* Favorite */}
      <button
        onClick={() => onToggleFavorite(contest.id)}
        className="absolute top-4 right-4 z-10"
      >
        <Star
          className={`w-5 h-5 transition-all ${
            isFavorited ? 'text-contest fill-contest' : 'text-muted hover:text-contest'
          }`}
        />
      </button>

      {/* Region Badge */}
      {region && (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white mb-3"
          style={{ backgroundColor: region.color }}
        >
          {region.emoji} {region.label}
        </span>
      )}

      {/* Title */}
      <h3 className="text-base font-semibold text-text mb-2 pr-8 group-hover:text-primary transition-colors line-clamp-2">
        {contest.title}
      </h3>

      {/* Organizer */}
      <p className="text-xs text-muted mb-3">{contest.organizer}</p>

      {/* Category */}
      <span className="inline-block px-2.5 py-1 rounded-lg bg-contest/10 text-contest text-xs font-medium mb-3">
        {contest.field}
      </span>

      {/* Deadline */}
      <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-4">
        <Calendar className="w-4 h-4" />
        <span>마감: {deadline.toLocaleDateString('ko-KR')}</span>
        {daysLeft > 0 && (
          <span className={`text-xs font-semibold ml-1 ${daysLeft <= 7 ? 'text-danger' : 'text-success'}`}>
            (D-{daysLeft})
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={contest.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          상세보기
        </a>
        <Link
          href="/contest/matches"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-white bg-accent rounded-xl hover:bg-accent-dark transition-colors"
        >
          <Users className="w-4 h-4" />
          팀원 찾기
        </Link>
      </div>
    </div>
  );
}

export default function ContestListPage() {
  const supabase = createClient();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState<ContestRegion | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ContestCategory | ''>('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 즐겨찾기 로드
    const saved = localStorage.getItem('contestFavorites');
    if (saved) setFavorites(new Set(JSON.parse(saved)));
  }, []);

  useEffect(() => {
    const fetchContests = async () => {
      setLoading(true);

      // 정적 데이터
      let combined: Contest[] = staticContests.filter((c) => !isExpiredContest(c.deadline));

      // 외부 수집 데이터
      const { data: external } = await supabase
        .from('external_contests')
        .select('*')
        .eq('is_active', true)
        .gte('deadline', new Date().toISOString().split('T')[0]);

      if (external) {
        const mapped: Contest[] = external.map((e: Record<string, unknown>) => ({
          id: e.id as string,
          title: e.title as string,
          organizer: (e.organizer as string) || '',
          field: (e.field as ContestCategory) || 'IT·과학',
          region: (e.region as ContestRegion) || '충청북도',
          start_date: (e.start_date as string) || '',
          end_date: (e.end_date as string) || '',
          deadline: (e.deadline as string) || '',
          prize: (e.prize as string) || null,
          description: (e.description as string) || '',
          url: e.url as string,
          image_url: null,
          source: 'crawled' as const,
          is_active: true,
        }));
        combined = [...combined, ...mapped];
      }

      // 필터
      if (regionFilter) combined = combined.filter((c) => c.region === regionFilter);
      if (categoryFilter) combined = combined.filter((c) => c.field === categoryFilter);

      setContests(combined);
      setLoading(false);
    };

    fetchContests();
  }, [regionFilter, categoryFilter]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('contestFavorites', JSON.stringify([...next]));
      return next;
    });
  };

  const favoriteContests = contests.filter((c) => favorites.has(c.id));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">공모전</h1>
          <p className="text-sm text-text-secondary mt-1">충청권 공모전 정보를 확인하세요</p>
        </div>
        <Link
          href="/contest/write"
          className="flex items-center gap-2 px-5 py-2.5 bg-contest text-white font-semibold rounded-xl hover:bg-contest/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">팀원 모집</span>
        </Link>
      </div>

      {/* Favorites */}
      {favoriteContests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-contest fill-contest" />
            즐겨찾기
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteContests.map((c) => (
              <ContestCard key={c.id} contest={c} isFavorited={true} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        </div>
      )}

      {/* Region Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
        <button
          onClick={() => setRegionFilter('')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            !regionFilter ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary hover:border-primary/30'
          }`}
        >
          전체 지역
        </button>
        {REGIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setRegionFilter(regionFilter === r.value ? '' : r.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              regionFilter === r.value
                ? 'text-white'
                : 'bg-card border border-border text-text-secondary hover:border-primary/30'
            }`}
            style={regionFilter === r.value ? { backgroundColor: r.color } : {}}
          >
            {r.emoji} {r.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
        <button
          onClick={() => setCategoryFilter('')}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !categoryFilter ? 'bg-contest text-white' : 'bg-card border border-border text-text-secondary'
          }`}
        >
          전체
        </button>
        {CONTEST_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategoryFilter(categoryFilter === c.value ? '' : c.value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              categoryFilter === c.value
                ? 'bg-contest text-white'
                : 'bg-card border border-border text-text-secondary'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Contest Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-contest animate-spin" />
        </div>
      ) : contests.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-contest mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">공모전이 없습니다</h3>
          <p className="text-sm text-text-secondary">다른 필터 조건으로 검색해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contests.map((c) => (
            <ContestCard
              key={c.id}
              contest={c}
              isFavorited={favorites.has(c.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SPORTS, SKILL_LEVELS } from '@/lib/constants';
import { Plus, MapPin, Clock, Users, Loader2, Swords } from 'lucide-react';
import type { Match, Sport, SkillLevel, Profile } from '@/types';

// ─── 종목 배지 컴포넌트 ────────────────────────────
function SportBadge({ sport }: { sport: Sport }) {
  const info = SPORTS.find((s) => s.value === sport);
  if (!info) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: info.color }}
    >
      {info.emoji} {info.label}
    </span>
  );
}

// ─── 수준 배지 컴포넌트 ────────────────────────────
function LevelBadge({ level }: { level: SkillLevel }) {
  const info = SKILL_LEVELS.find((l) => l.value === level);
  if (!info) return null;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: info.color, color: level === '고수' ? '#fff' : '#1a1a1a' }}
    >
      {info.label}
    </span>
  );
}

// ─── 매치 카드 ────────────────────────────────────
function MatchCard({
  match,
  currentUserId,
  appliedIds,
  onApply,
}: {
  match: Match & { author: Profile };
  currentUserId: string;
  appliedIds: Set<string>;
  onApply: (matchId: string) => void;
}) {
  const isOwner = match.author_id === currentUserId;
  const isApplied = appliedIds.has(match.id);
  const datetime = new Date(match.match_datetime);
  const dateStr = datetime.toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
  const timeStr = datetime.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className="group bg-card rounded-2xl border border-border hover:border-primary/20 hover:shadow-card-hover transition-all duration-300 p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SportBadge sport={match.sport} />
          <span className="text-xs text-muted">|</span>
          <span className="text-sm font-medium text-text-secondary">{match.match_size}</span>
          <span className="text-xs text-muted">|</span>
          <LevelBadge level={match.required_level} />
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          match.status === '모집중'
            ? 'bg-success/10 text-success'
            : match.status === '매치확정'
            ? 'bg-primary/10 text-primary'
            : 'bg-muted/10 text-muted'
        }`}>
          {match.status === '모집중' ? '🟢 모집 중' : match.status}
        </div>
      </div>

      {/* Team Name */}
      <h3 className="text-lg font-semibold text-text mb-2 group-hover:text-primary transition-colors">
        {match.team_name}
      </h3>

      {/* Location & Time */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-text-secondary mb-3">
        {match.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-accent" />
            <span>{match.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary" />
          <span>{dateStr} {timeStr}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{match.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Users className="w-3.5 h-3.5" />
          <span>{match.author?.nickname || '작성자'}</span>
        </div>

        {match.status === '모집중' && (
          isOwner ? (
            <Link
              href={`/match/${match.id}`}
              className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
            >
              상세보기
            </Link>
          ) : isApplied ? (
            <span className="px-4 py-2 text-sm font-medium text-muted bg-muted/10 rounded-xl cursor-default">
              신청 완료
            </span>
          ) : (
            <button
              onClick={() => onApply(match.id)}
              className="px-4 py-2 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-dark transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              매치 신청
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────
export default function MatchListPage() {
  const supabase = createClient();

  const [matches, setMatches] = useState<(Match & { author: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [sportFilter, setSportFilter] = useState<Sport | ''>('');
  const [levelFilter, setLevelFilter] = useState<SkillLevel | ''>('');

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('matches')
      .select('*, author:profiles!author_id(*)')
      .eq('status', '모집중')
      .gte('match_datetime', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (sportFilter) query = query.eq('sport', sportFilter);
    if (levelFilter) query = query.eq('required_level', levelFilter);

    const { data } = await query;
    if (data) setMatches(data as (Match & { author: Profile })[]);
    setLoading(false);
  }, [sportFilter, levelFilter]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);

        // 내가 신청한 매치 ID들
        const { data: apps } = await supabase
          .from('match_applications')
          .select('match_id')
          .eq('applicant_id', user.id)
          .in('status', ['pending', 'accepted']);

        if (apps) {
          setAppliedIds(new Set(apps.map((a) => a.match_id)));
        }
      }
      await fetchMatches();
    };
    init();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [sportFilter, levelFilter, fetchMatches]);

  // Realtime 구독 — 신청 DELETE 감지
  useEffect(() => {
    const channel = supabase
      .channel('match-apps')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'match_applications' },
        (payload) => {
          setAppliedIds((prev) => {
            const next = new Set(prev);
            next.delete((payload.old as { match_id: string }).match_id);
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApply = async (matchId: string) => {
    const { error } = await supabase.from('match_applications').insert({
      match_id: matchId,
      applicant_id: currentUserId,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        alert('이미 신청한 매치입니다.');
      } else {
        alert('신청 중 오류가 발생했습니다.');
      }
      return;
    }

    setAppliedIds((prev) => new Set(prev).add(matchId));

    // 작성자에게 알림
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, skill_level')
        .eq('id', currentUserId)
        .single();

      await supabase.from('notifications').insert({
        user_id: match.author_id,
        type: 'match_application',
        message: `${profile?.nickname || ''}님이 매치를 신청했습니다. 실력: ${profile?.skill_level || '미설정'}`,
        related_id: matchId,
        related_type: 'match',
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">스포츠 매치</h1>
          <p className="text-sm text-text-secondary mt-1">원하는 종목과 수준의 매치를 찾아보세요</p>
        </div>
        <Link
          href="/match/write"
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-dark transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">매치글 작성</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Sport Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSportFilter('')}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !sportFilter ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary hover:border-primary/30'
            }`}
          >
            전체
          </button>
          {SPORTS.map((sport) => (
            <button
              key={sport.value}
              onClick={() => setSportFilter(sportFilter === sport.value ? '' : sport.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sportFilter === sport.value
                  ? 'text-white'
                  : 'bg-card border border-border text-text-secondary hover:border-primary/30'
              }`}
              style={sportFilter === sport.value ? { backgroundColor: sport.color } : {}}
            >
              {sport.emoji} {sport.label}
            </button>
          ))}
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLevelFilter('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !levelFilter ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary hover:border-primary/30'
            }`}
          >
            전체
          </button>
          {SKILL_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setLevelFilter(levelFilter === level.value ? '' : level.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                levelFilter === level.value
                  ? 'text-text font-semibold ring-2 ring-offset-1'
                  : 'bg-card border border-border text-text-secondary hover:border-primary/30'
              }`}
              style={levelFilter === level.value ? { backgroundColor: level.color } : {}}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Match List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Swords className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">매치가 없습니다</h3>
          <p className="text-sm text-text-secondary mb-4">
            {sportFilter || levelFilter
              ? '다른 필터 조건으로 검색해 보세요.'
              : '첫 번째 매치글을 작성해 보세요!'}
          </p>
          <Link
            href="/match/write"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-dark transition-all"
          >
            <Plus className="w-5 h-5" />
            매치글 작성
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              currentUserId={currentUserId}
              appliedIds={appliedIds}
              onApply={handleApply}
            />
          ))}
        </div>
      )}
    </div>
  );
}


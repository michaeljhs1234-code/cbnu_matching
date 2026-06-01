'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { REGIONS, CONTEST_CATEGORIES } from '@/lib/constants';
import { Plus, Users, Loader2, Trophy, Clock } from 'lucide-react';
import type { ContestMatch, Profile, ContestRegion, ContestCategory } from '@/types';

function SlotsLeftBadge({ remaining }: { remaining: number }) {
  const color = remaining >= 3 ? 'bg-success/10 text-success' : remaining >= 2 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger';
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {remaining}자리 남음
    </span>
  );
}

function ContestMatchCard({
  match,
  currentUserId,
  appliedIds,
  onApply,
}: {
  match: ContestMatch & { author: Profile };
  currentUserId: string;
  appliedIds: Set<string>;
  onApply: (id: string) => void;
}) {
  const isOwner = match.author_id === currentUserId;
  const isApplied = appliedIds.has(match.id);
  const remaining = match.team_size - match.current_count;
  const region = REGIONS.find(r => r.value === match.region);
  const deadline = new Date(match.deadline);
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="group bg-card rounded-2xl border border-border hover:border-contest/30 hover:shadow-card-hover transition-all duration-300 p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {region && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: region.color }}>
              {region.emoji} {region.label}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-contest/10 text-contest text-xs font-medium">
            {match.contest_category}
          </span>
        </div>
        <SlotsLeftBadge remaining={remaining} />
      </div>

      <h3 className="text-base font-semibold text-text mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
        {match.contest_name}
      </h3>

      <div className="flex items-center gap-3 text-xs text-muted mb-3">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {match.author?.nickname}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          마감 {deadline.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
          {daysLeft > 0 && <span className={daysLeft <= 3 ? 'text-danger font-semibold' : ''}>(D-{daysLeft})</span>}
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{match.description}</p>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted">모집 현황</span>
          <span className="font-medium text-text">{match.current_count} / {match.team_size}명</span>
        </div>
        <div className="h-2 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(match.current_count / match.team_size) * 100}%`,
              backgroundColor: remaining >= 3 ? '#22C55E' : remaining >= 2 ? '#EAB308' : '#EF4444',
            }}
          />
        </div>
      </div>

      {/* Action */}
      {match.status === '모집중' && (
        isOwner ? (
          <Link href={`/profile`} className="block w-full text-center py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors">
            신청 관리
          </Link>
        ) : isApplied ? (
          <span className="block w-full text-center py-2.5 text-sm font-medium text-muted bg-muted/10 rounded-xl cursor-default">
            신청 완료
          </span>
        ) : (
          <button onClick={() => onApply(match.id)} className="w-full py-2.5 text-sm font-semibold text-white bg-contest rounded-xl hover:bg-contest/90 transition-all hover:shadow-md">
            팀원 신청
          </button>
        )
      )}
    </div>
  );
}

export default function ContestMatchesPage() {
  const supabase = createClient();
  const [matches, setMatches] = useState<(ContestMatch & { author: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [regionFilter, setRegionFilter] = useState<ContestRegion | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ContestCategory | ''>('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: apps } = await supabase
          .from('contest_applications')
          .select('contest_match_id')
          .eq('applicant_id', user.id)
          .in('status', ['pending', 'accepted']);
        if (apps) setAppliedIds(new Set(apps.map(a => a.contest_match_id)));
      }
      await fetchMatches();
    };
    init();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    let query = supabase
      .from('contest_matches')
      .select('*, author:profiles!author_id(*)')
      .eq('status', '모집중')
      .gte('deadline', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    if (regionFilter) query = query.eq('region', regionFilter);
    if (categoryFilter) query = query.eq('contest_category', categoryFilter);

    const { data } = await query;
    if (data) setMatches(data as (ContestMatch & { author: Profile })[]);
    setLoading(false);
  };

  useEffect(() => { fetchMatches(); }, [regionFilter, categoryFilter]);

  // Realtime — 남은 자리 실시간 갱신
  useEffect(() => {
    const channel = supabase
      .channel('contest-matches-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contest_matches' }, (payload) => {
        const updated = payload.new as ContestMatch;
        setMatches(prev => {
          if (updated.status === '마감') return prev.filter(m => m.id !== updated.id);
          return prev.map(m => m.id === updated.id ? { ...m, ...updated } : m);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApply = async (contestMatchId: string) => {
    const { error } = await supabase.from('contest_applications').insert({
      contest_match_id: contestMatchId,
      applicant_id: currentUserId,
      status: 'pending',
    });

    if (error) {
      alert(error.code === '23505' ? '이미 신청했습니다.' : '신청 중 오류가 발생했습니다.');
      return;
    }

    setAppliedIds(prev => new Set(prev).add(contestMatchId));

    // 팀장에게 알림
    const match = matches.find(m => m.id === contestMatchId);
    if (match) {
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', currentUserId).single();
      await supabase.from('notifications').insert({
        user_id: match.author_id,
        type: 'contest_application',
        message: `${profile?.nickname || ''}님이 팀원을 신청했습니다.`,
        related_id: contestMatchId,
        related_type: 'contest_match',
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">팀원 모집</h1>
          <p className="text-sm text-text-secondary mt-1">공모전 팀원을 찾아보세요</p>
        </div>
        <Link href="/contest/write" className="flex items-center gap-2 px-5 py-2.5 bg-contest text-white font-semibold rounded-xl hover:bg-contest/90 transition-all hover:shadow-lg hover:-translate-y-0.5">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">모집 작성</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
        <button onClick={() => setRegionFilter('')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!regionFilter ? 'bg-contest text-white' : 'bg-card border border-border text-text-secondary'}`}>전체</button>
        {REGIONS.map(r => (
          <button key={r.value} onClick={() => setRegionFilter(regionFilter === r.value ? '' : r.value)} className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${regionFilter === r.value ? 'text-white' : 'bg-card border border-border text-text-secondary'}`} style={regionFilter === r.value ? { backgroundColor: r.color } : {}}>{r.emoji} {r.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6 scrollbar-none">
        <button onClick={() => setCategoryFilter('')} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!categoryFilter ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary'}`}>전체</button>
        {CONTEST_CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategoryFilter(categoryFilter === c.value ? '' : c.value)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${categoryFilter === c.value ? 'bg-primary text-white' : 'bg-card border border-border text-text-secondary'}`}>{c.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-contest animate-spin" /></div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-12 h-12 text-contest/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">모집 중인 팀이 없습니다</h3>
          <p className="text-sm text-text-secondary mb-4">첫 팀원 모집글을 작성해 보세요!</p>
          <Link href="/contest/write" className="inline-flex items-center gap-2 px-6 py-3 bg-contest text-white font-semibold rounded-xl hover:bg-contest/90 transition-all">
            <Plus className="w-5 h-5" /> 모집 작성
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(m => (
            <ContestMatchCard key={m.id} match={m} currentUserId={currentUserId} appliedIds={appliedIds} onApply={handleApply} />
          ))}
        </div>
      )}
    </div>
  );
}

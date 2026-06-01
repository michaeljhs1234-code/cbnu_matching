'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SPORTS, SKILL_LEVELS } from '@/lib/constants';
import {
  ArrowLeft, MapPin, Clock, Users, Loader2, Star,
  CheckCircle, XCircle, MessageCircle, Trash2, Edit3,
} from 'lucide-react';
import type { Match, Profile, MatchApplication } from '@/types';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const matchId = params.id as string;

  const [match, setMatch] = useState<(Match & { author: Profile }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [applications, setApplications] = useState<(MatchApplication & { applicant: Profile })[]>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // 매치 상세
      const { data: m } = await supabase
        .from('matches')
        .select('*, author:profiles!author_id(*)')
        .eq('id', matchId)
        .single();

      if (m) {
        setMatch(m as Match & { author: Profile });

        // 내가 신청했는지
        if (user) {
          const { data: app } = await supabase
            .from('match_applications')
            .select('id')
            .eq('match_id', matchId)
            .eq('applicant_id', user.id)
            .maybeSingle();
          setHasApplied(!!app);

          // 작성자면 신청 목록 조회
          if (m.author_id === user.id) {
            const { data: apps } = await supabase
              .from('match_applications')
              .select('*, applicant:profiles!applicant_id(*)')
              .eq('match_id', matchId)
              .eq('status', 'pending');
            if (apps) setApplications(apps as (MatchApplication & { applicant: Profile })[]);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, [matchId]);

  const handleApply = async () => {
    if (!currentUserId || hasApplied) return;
    setApplying(true);

    const { error } = await supabase.from('match_applications').insert({
      match_id: matchId,
      applicant_id: currentUserId,
      status: 'pending',
    });

    if (error) {
      alert(error.code === '23505' ? '이미 신청한 매치입니다.' : '신청 중 오류가 발생했습니다.');
    } else {
      setHasApplied(true);

      // 알림
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
    }
    setApplying(false);
  };

  const handleAccept = async (appId: string, applicantId: string) => {
    // 신청 수락
    await supabase.from('match_applications').update({ status: 'accepted' }).eq('id', appId);

    // 매치 확정
    await supabase.from('matches').update({ status: '매치확정' }).eq('id', matchId);

    // 1:1 채팅방 생성
    await supabase.from('message_rooms').insert({
      application_id: appId,
      participant_1: currentUserId,
      participant_2: applicantId,
    });

    // 알림
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', currentUserId)
      .single();

    await supabase.from('notifications').insert({
      user_id: applicantId,
      type: 'match_accepted',
      message: `매치가 수락되었습니다! ${match?.team_name}과의 매치 확정`,
      related_id: matchId,
      related_type: 'match',
    });

    setApplications(prev => prev.filter(a => a.id !== appId));
    setMatch(prev => prev ? { ...prev, status: '매치확정' } : prev);
  };

  const handleReject = async (appId: string, applicantId: string) => {
    await supabase.from('match_applications').update({ status: 'rejected' }).eq('id', appId);

    await supabase.from('notifications').insert({
      user_id: applicantId,
      type: 'match_rejected',
      message: '매치 신청이 거절되었습니다.',
      related_id: matchId,
      related_type: 'match',
    });

    setApplications(prev => prev.filter(a => a.id !== appId));
  };

  const handleDelete = async () => {
    if (!confirm('매치글을 삭제하시겠습니까?')) return;
    await supabase.from('matches').delete().eq('id', matchId);
    router.push('/match');
  };

  const handleCancel = async () => {
    if (!confirm('확정된 매치를 취소하시겠습니까?')) return;
    await supabase.from('matches').update({ status: '취소됨' }).eq('id', matchId);

    // 상대방에게 알림
    const { data: apps } = await supabase
      .from('match_applications')
      .select('applicant_id')
      .eq('match_id', matchId)
      .eq('status', 'accepted');

    if (apps) {
      for (const app of apps) {
        await supabase.from('notifications').insert({
          user_id: app.applicant_id,
          type: 'match_cancelled',
          message: `${match?.author?.nickname}님이 매치를 취소했습니다.`,
          related_id: matchId,
          related_type: 'match',
        });
      }
    }

    setMatch(prev => prev ? { ...prev, status: '취소됨' } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-text mb-2">매치를 찾을 수 없습니다</h2>
        <Link href="/match" className="text-primary hover:underline text-sm">목록으로 돌아가기</Link>
      </div>
    );
  }

  const sportInfo = SPORTS.find(s => s.value === match.sport);
  const levelInfo = SKILL_LEVELS.find(l => l.value === match.required_level);
  const isOwner = match.author_id === currentUserId;
  const datetime = new Date(match.match_datetime);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-primary/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <h1 className="text-2xl font-bold text-text">매치 상세</h1>
      </div>

      {/* Match Detail Card */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 animate-slide-up">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {sportInfo && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold text-white" style={{ backgroundColor: sportInfo.color }}>
              {sportInfo.emoji} {sportInfo.label}
            </span>
          )}
          <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary">
            {match.match_size}
          </span>
          {levelInfo && (
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: levelInfo.color, color: match.required_level === '고수' ? '#fff' : '#1a1a1a' }}>
              {levelInfo.label}
            </span>
          )}
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            match.status === '모집중' ? 'bg-success/10 text-success'
              : match.status === '매치확정' ? 'bg-primary/10 text-primary'
              : 'bg-danger/10 text-danger'
          }`}>
            {match.status}
          </span>
        </div>

        {/* Team Name */}
        <h2 className="text-2xl font-bold text-text mb-4">{match.team_name}</h2>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {match.location && (
            <div className="flex items-center gap-2 text-sm text-text-secondary p-3 bg-bg rounded-xl">
              <MapPin className="w-4 h-4 text-accent shrink-0" />
              <span>{match.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-text-secondary p-3 bg-bg rounded-xl">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>
              {datetime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              {' '}
              {datetime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary p-3 bg-bg rounded-xl">
            <Users className="w-4 h-4 text-muted shrink-0" />
            <span>작성자: {match.author?.nickname}</span>
          </div>
          {match.author?.skill_level && (
            <div className="flex items-center gap-2 text-sm text-text-secondary p-3 bg-bg rounded-xl">
              <Star className="w-4 h-4 text-contest shrink-0" />
              <span>실력: {match.author.skill_level}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="p-4 bg-bg rounded-xl mb-6">
          <h3 className="text-sm font-semibold text-text mb-2">소개글</h3>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{match.description}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {isOwner ? (
            <>
              {match.status === '모집중' && (
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-danger bg-danger/10 rounded-xl hover:bg-danger/20 transition-colors">
                  <Trash2 className="w-4 h-4" /> 삭제
                </button>
              )}
              {match.status === '매치확정' && (
                <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-danger bg-danger/10 rounded-xl hover:bg-danger/20 transition-colors">
                  <XCircle className="w-4 h-4" /> 매치 취소
                </button>
              )}
            </>
          ) : (
            <>
              {match.status === '모집중' && !hasApplied && (
                <button onClick={handleApply} disabled={applying} className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-dark transition-all hover:shadow-md disabled:opacity-50">
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  매치 신청
                </button>
              )}
              {hasApplied && (
                <span className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-medium text-muted bg-muted/10 rounded-xl">
                  <CheckCircle className="w-4 h-4" /> 신청 완료
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pending Applications (작성자만) */}
      {isOwner && applications.length > 0 && (
        <div className="mt-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg font-semibold text-text mb-4">받은 신청 ({applications.length}건)</h3>
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">{app.applicant?.nickname?.[0]}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-text text-sm">{app.applicant?.nickname}</h4>
                    <p className="text-xs text-muted">실력: {app.applicant?.skill_level || '미설정'} · {app.applicant?.department || ''}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(app.id, app.applicant_id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> 수락
                  </button>
                  <button
                    onClick={() => handleReject(app.id, app.applicant_id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-danger rounded-lg hover:bg-danger/90 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> 거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

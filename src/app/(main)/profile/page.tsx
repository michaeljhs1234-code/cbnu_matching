'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SKILL_LEVELS } from '@/lib/constants';
import {
  User,
  Mail,
  Hash,
  GraduationCap,
  Star,
  AlertTriangle,
  Edit3,
  Save,
  Loader2,
  FileText,
  Inbox,
  Send,
  Trophy,
  Calendar,
  Swords,
} from 'lucide-react';
import type { Profile, Match, MatchApplication } from '@/types';

const TABS = [
  { id: 'matches', label: '내 매치글', icon: Swords },
  { id: 'received', label: '받은 신청', icon: Inbox },
  { id: 'sent', label: '지원한 신청', icon: Send },
  { id: 'confirmed', label: '내 경기', icon: Trophy },
  { id: 'sports', label: '스포츠 프로필', icon: User },
  { id: 'contest', label: '공모전 프로필', icon: FileText },
  { id: 'reviews', label: '매너 평가', icon: Star },
];

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [saving, setSaving] = useState(false);

  // Tab data
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [receivedApps, setReceivedApps] = useState<(MatchApplication & { applicant: Profile; match: Match })[]>([]);
  const [sentApps, setSentApps] = useState<(MatchApplication & { match: Match })[]>([]);
  const [confirmedMatches, setConfirmedMatches] = useState<Match[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (p) {
        setProfile(p);
        setNickname(p.nickname);
        setSkillLevel(p.skill_level || '');
      }

      // 내 매치글
      const { data: mm } = await supabase
        .from('matches')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      if (mm) setMyMatches(mm);

      // 받은 신청
      const { data: ra } = await supabase
        .from('match_applications')
        .select('*, applicant:profiles!applicant_id(*), match:matches!match_id(*)')
        .eq('status', 'pending')
        .in('match_id', (mm || []).map(m => m.id));
      if (ra) setReceivedApps(ra as never[]);

      // 지원한 신청
      const { data: sa } = await supabase
        .from('match_applications')
        .select('*, match:matches!match_id(*)')
        .eq('applicant_id', user.id)
        .neq('status', 'rejected');
      if (sa) setSentApps(sa as never[]);

      // 확정 매치
      const { data: cm } = await supabase
        .from('matches')
        .select('*')
        .eq('status', '매치확정')
        .or(`author_id.eq.${user.id}`);
      if (cm) setConfirmedMatches(cm);

      // 매너 평가
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user.id);
      if (reviews && reviews.length > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        setAvgRating(Math.round((sum / reviews.length) * 10) / 10);
        setReviewCount(reviews.length);
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({
      nickname,
      skill_level: skillLevel || null,
    }).eq('id', profile.id);
    setProfile({ ...profile, nickname, skill_level: skillLevel as Profile['skill_level'] });
    setEditing(false);
    setSaving(false);
  };

  const handleAccept = async (appId: string) => {
    await supabase.from('match_applications').update({ status: 'accepted' }).eq('id', appId);
    setReceivedApps(prev => prev.filter(a => a.id !== appId));
  };

  const handleReject = async (appId: string) => {
    await supabase.from('match_applications').update({ status: 'rejected' }).eq('id', appId);
    setReceivedApps(prev => prev.filter(a => a.id !== appId));
  };

  const handleWithdraw = async (appId: string) => {
    await supabase.from('match_applications').delete().eq('id', appId);
    setSentApps(prev => prev.filter(a => a.id !== appId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const maskedStudentId = profile.student_id.substring(0, 4) + '*'.repeat(6);
  const maskedEmail = profile.email.replace(/^(.{3}).*(@.*)$/, '$1****$2');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text mb-6">내 정보</h1>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              {editing ? (
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="text-lg font-semibold text-text border border-border rounded-lg px-2 py-1"
                  maxLength={10}
                />
              ) : (
                <h2 className="text-lg font-semibold text-text">{profile.nickname}</h2>
              )}
              <div className="flex items-center gap-1 text-sm text-muted mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {maskedEmail}
              </div>
            </div>
          </div>
          <button
            onClick={() => editing ? handleSaveProfile() : setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {editing ? '저장' : '수정'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Hash className="w-4 h-4 text-muted" />
            <span className="text-text-secondary">{maskedStudentId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="w-4 h-4 text-muted" />
            <span className="text-text-secondary">{profile.department}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-contest" />
            <span className="text-text-secondary">★ {avgRating || '-'} ({reviewCount}건)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {editing ? (
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="text-sm border border-border rounded-lg px-2 py-1"
              >
                <option value="">수준 선택</option>
                {SKILL_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-muted" />
                <span className="text-text-secondary">실력: {profile.skill_level || '미설정'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-card border border-border text-text-secondary hover:border-primary/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'matches' && (
          <div className="space-y-3">
            {myMatches.length === 0 ? (
              <p className="text-center text-muted py-12">작성한 매치글이 없습니다.</p>
            ) : myMatches.map((m) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text">{m.team_name}</h3>
                  <p className="text-xs text-muted">{m.sport} · {m.match_size} · {m.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'received' && (
          <div className="space-y-3">
            {receivedApps.length === 0 ? (
              <p className="text-center text-muted py-12">받은 신청이 없습니다.</p>
            ) : receivedApps.map((app) => (
              <div key={app.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text">{app.applicant?.nickname}</h3>
                    <p className="text-xs text-muted">실력: {app.applicant?.skill_level || '미설정'} · {app.match?.team_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(app.id)} className="px-3 py-1.5 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors">수락</button>
                    <button onClick={() => handleReject(app.id)} className="px-3 py-1.5 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors">거절</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-3">
            {sentApps.length === 0 ? (
              <p className="text-center text-muted py-12">지원한 신청이 없습니다.</p>
            ) : sentApps.map((app) => (
              <div key={app.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text">{app.match?.team_name}</h3>
                  <p className="text-xs text-muted">상태: {app.status === 'pending' ? '검토 중' : '수락됨'}</p>
                </div>
                {app.status === 'pending' && (
                  <button onClick={() => handleWithdraw(app.id)} className="px-3 py-1.5 bg-muted/20 text-muted text-sm font-medium rounded-lg hover:bg-danger/10 hover:text-danger transition-colors">취소</button>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'confirmed' && (
          <div className="space-y-3">
            {confirmedMatches.length === 0 ? (
              <p className="text-center text-muted py-12">확정된 경기가 없습니다.</p>
            ) : confirmedMatches.map((m) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-medium text-text">{m.team_name}</h3>
                <p className="text-xs text-muted">{m.sport} · {new Date(m.match_datetime).toLocaleDateString('ko-KR')}</p>
              </div>
            ))}
          </div>
        )}

        {(activeTab === 'sports' || activeTab === 'contest') && (
          <div className="bg-card rounded-xl border border-border p-6 text-center text-muted">
            <User className="w-12 h-12 mx-auto mb-3 text-primary/30" />
            <p>{activeTab === 'sports' ? '스포츠' : '공모전'} 프로필 설정 기능이 곧 제공됩니다.</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Star className="w-12 h-12 mx-auto mb-3 text-contest" />
            <p className="text-lg font-semibold text-text">평균 ★ {avgRating || '-'}</p>
            <p className="text-sm text-muted">{reviewCount}건의 평가</p>
          </div>
        )}
      </div>
    </div>
  );
}

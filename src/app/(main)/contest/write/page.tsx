'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { REGIONS, CONTEST_CATEGORIES } from '@/lib/constants';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ContestRegion, ContestCategory } from '@/types';

export default function ContestWritePage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    contestName: '',
    category: '' as ContestCategory | '',
    region: '' as ContestRegion | '',
    deadline: '',
    teamSize: 1,
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.contestName || form.contestName.length > 100) e.contestName = '공모전 이름을 입력해 주세요. (100자 이내)';
    if (!form.category) e.category = '분야를 선택해 주세요.';
    if (!form.region) e.region = '지역을 선택해 주세요.';
    if (!form.deadline) e.deadline = '마감일을 선택해 주세요.';
    else if (new Date(form.deadline) <= new Date()) e.deadline = '마감일은 오늘 이후여야 합니다.';
    if (form.teamSize < 1 || form.teamSize > 5) e.teamSize = '모집 인원은 1~5명입니다.';
    if (!form.description || form.description.length < 10) e.description = '소개글을 10자 이상 입력해 주세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. contest_matches INSERT
      const { data: cm, error: cmError } = await supabase
        .from('contest_matches')
        .insert({
          author_id: user.id,
          contest_name: form.contestName,
          contest_category: form.category,
          region: form.region,
          deadline: form.deadline,
          team_size: form.teamSize,
          current_count: 0,
          description: form.description,
          status: '모집중',
        })
        .select()
        .single();

      if (cmError || !cm) {
        alert('모집글 작성 중 오류가 발생했습니다.');
        return;
      }

      // 2. contest_chat_rooms INSERT (그룹 채팅방 자동 생성)
      const { data: chatRoom } = await supabase
        .from('contest_chat_rooms')
        .insert({ contest_match_id: cm.id })
        .select()
        .single();

      // 3. contest_chat_members INSERT (작성자 자동 추가)
      if (chatRoom) {
        await supabase.from('contest_chat_members').insert({
          room_id: chatRoom.id,
          user_id: user.id,
        });
      }

      router.push('/contest/matches');
      router.refresh();
    } catch {
      alert('모집글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border ${
      errors[field] ? 'border-danger bg-danger/5' : 'border-border'
    } bg-white text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-primary/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">팀원 모집 작성</h1>
          <p className="text-sm text-text-secondary mt-0.5">공모전 팀원을 모집하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6">
        {/* 공모전 이름 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">공모전 이름</label>
          <input
            type="text"
            placeholder="참여하려는 공모전 이름"
            value={form.contestName}
            onChange={(e) => setForm({ ...form, contestName: e.target.value })}
            className={inputClass('contestName')}
            maxLength={100}
          />
          {errors.contestName && <p className="mt-1 text-xs text-danger">{errors.contestName}</p>}
        </div>

        {/* 분야 */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">분야</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONTEST_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, category: c.value })}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border-2 transition-all ${
                  form.category === c.value
                    ? 'border-contest bg-contest/10 text-contest'
                    : 'border-border text-text-secondary hover:border-contest/30'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.category && <p className="mt-1 text-xs text-danger">{errors.category}</p>}
        </div>

        {/* 지역 */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">지역</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, region: r.value })}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  form.region === r.value
                    ? 'text-white border-transparent'
                    : 'border-border text-text-secondary hover:border-primary/30'
                }`}
                style={form.region === r.value ? { backgroundColor: r.color } : {}}
              >
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          {errors.region && <p className="mt-1 text-xs text-danger">{errors.region}</p>}
        </div>

        {/* 마감일 & 인원 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">마감일</label>
            <input
              type="date"
              value={form.deadline}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className={inputClass('deadline')}
            />
            {errors.deadline && <p className="mt-1 text-xs text-danger">{errors.deadline}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">모집 인원 (본인 제외)</label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, teamSize: n })}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.teamSize === n
                      ? 'border-contest bg-contest text-white'
                      : 'border-border text-text-secondary hover:border-contest/30'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {errors.teamSize && <p className="mt-1 text-xs text-danger">{errors.teamSize}</p>}
          </div>
        </div>

        {/* 소개글 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">소개글</label>
          <textarea
            placeholder="팀 소개, 모집 조건, 역할 등을 자유롭게 작성하세요 (10자 이상)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputClass('description')} min-h-[120px] resize-none`}
          />
          <div className="flex justify-between mt-1">
            {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
            <p className="text-xs text-muted ml-auto">{form.description.length}자</p>
          </div>
        </div>

        {/* 제출 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-contest text-white font-semibold rounded-xl hover:bg-contest/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> 작성 중...</> : '모집글 작성'}
        </button>
      </form>
    </div>
  );
}

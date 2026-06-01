'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SPORTS, SKILL_LEVELS, MATCH_SIZE_PRESETS } from '@/lib/constants';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Sport, SkillLevel } from '@/types';

export default function MatchWritePage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    teamName: '',
    sport: '' as Sport | '',
    matchSize: '',
    location: '',
    matchDate: '',
    matchTime: '',
    description: '',
    requiredLevel: '' as SkillLevel | '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSportSelect = (sport: Sport) => {
    const presets = MATCH_SIZE_PRESETS[sport];
    setForm((prev) => ({
      ...prev,
      sport,
      matchSize: presets?.[0] || prev.matchSize,
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.teamName || form.teamName.length < 2 || form.teamName.length > 20)
      newErrors.teamName = '팀명은 2~20자로 입력해 주세요.';
    if (!form.sport) newErrors.sport = '종목을 선택해 주세요.';
    if (!form.matchSize) newErrors.matchSize = '매치 인원을 입력해 주세요.';
    if (!form.location) newErrors.location = '장소를 입력해 주세요.';
    if (!form.matchDate) newErrors.matchDate = '날짜를 선택해 주세요.';
    if (!form.matchTime) newErrors.matchTime = '시간을 선택해 주세요.';
    if (!form.description || form.description.length < 10 || form.description.length > 500)
      newErrors.description = '소개글은 10~500자로 입력해 주세요.';
    if (!form.requiredLevel) newErrors.requiredLevel = '원하는 수준을 선택해 주세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const matchDatetime = new Date(`${form.matchDate}T${form.matchTime}`).toISOString();

      const { error } = await supabase.from('matches').insert({
        author_id: user.id,
        team_name: form.teamName,
        sport: form.sport,
        match_size: form.matchSize,
        location: form.location,
        match_datetime: matchDatetime,
        description: form.description,
        required_level: form.requiredLevel,
        status: '모집중',
      });

      if (error) {
        alert('매치글 작성 중 오류가 발생했습니다.');
        return;
      }

      router.push('/match');
      router.refresh();
    } catch {
      alert('매치글 작성 중 오류가 발생했습니다.');
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-primary/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text">매치글 작성</h1>
          <p className="text-sm text-text-secondary mt-0.5">팀 정보와 매치 조건을 입력하세요</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6">
        {/* 팀명 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">팀명</label>
          <input
            type="text"
            placeholder="우리 팀 이름"
            value={form.teamName}
            onChange={(e) => setForm({ ...form, teamName: e.target.value })}
            className={inputClass('teamName')}
            maxLength={20}
          />
          {errors.teamName && <p className="mt-1 text-xs text-danger">{errors.teamName}</p>}
        </div>

        {/* 종목 선택 */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">종목</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {SPORTS.map((sport) => (
              <button
                key={sport.value}
                type="button"
                onClick={() => handleSportSelect(sport.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  form.sport === sport.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">{sport.emoji}</span>
                <span className="text-xs font-medium text-text">{sport.label}</span>
              </button>
            ))}
          </div>
          {errors.sport && <p className="mt-1 text-xs text-danger">{errors.sport}</p>}
        </div>

        {/* 매치 인원 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">매치 인원</label>
          {form.sport && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {MATCH_SIZE_PRESETS[form.sport as Sport]?.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, matchSize: preset })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.matchSize === preset
                      ? 'bg-primary text-white'
                      : 'bg-primary/5 text-primary hover:bg-primary/10'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            placeholder="예: 5vs5, 듀오(2인)"
            value={form.matchSize}
            onChange={(e) => setForm({ ...form, matchSize: e.target.value })}
            className={inputClass('matchSize')}
          />
          {errors.matchSize && <p className="mt-1 text-xs text-danger">{errors.matchSize}</p>}
        </div>

        {/* 장소 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">장소</label>
          <input
            type="text"
            placeholder="장소를 입력하세요 (예: 풋살장 A)"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className={inputClass('location')}
          />
          {errors.location && <p className="mt-1 text-xs text-danger">{errors.location}</p>}
        </div>

        {/* 날짜·시간 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">날짜</label>
            <input
              type="date"
              value={form.matchDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
              className={inputClass('matchDate')}
            />
            {errors.matchDate && <p className="mt-1 text-xs text-danger">{errors.matchDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">시간</label>
            <input
              type="time"
              value={form.matchTime}
              onChange={(e) => setForm({ ...form, matchTime: e.target.value })}
              className={inputClass('matchTime')}
            />
            {errors.matchTime && <p className="mt-1 text-xs text-danger">{errors.matchTime}</p>}
          </div>
        </div>

        {/* 원하는 수준 */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">원하는 수준</label>
          <div className="flex gap-2">
            {SKILL_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setForm({ ...form, requiredLevel: level.value })}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.requiredLevel === level.value
                    ? 'border-transparent text-text shadow-sm'
                    : 'border-border text-text-secondary hover:border-primary/30'
                }`}
                style={
                  form.requiredLevel === level.value
                    ? { backgroundColor: level.color }
                    : {}
                }
              >
                {level.label}
              </button>
            ))}
          </div>
          {errors.requiredLevel && <p className="mt-1 text-xs text-danger">{errors.requiredLevel}</p>}
        </div>

        {/* 소개글 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">소개글</label>
          <textarea
            placeholder="같이 즐겁게 뛸 팀 구해요! (10~500자)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${inputClass('description')} min-h-[120px] resize-none`}
            maxLength={500}
          />
          <div className="flex justify-between mt-1">
            {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
            <p className="text-xs text-muted ml-auto">{form.description.length}/500</p>
          </div>
        </div>

        {/* 제출 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              작성 중...
            </>
          ) : (
            '매치글 작성'
          )}
        </button>
      </form>
    </div>
  );
}

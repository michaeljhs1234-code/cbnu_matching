'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SPORTS, SKILL_LEVELS, MATCH_SIZE_PRESETS } from '@/lib/constants';
import { ArrowLeft, Loader2, Link2, Unlink, Calendar, MapPin, Info } from 'lucide-react';
import type { Sport, SkillLevel } from '@/types';

const FACILITY_MAP: Record<string, { label: string; sport: Sport }> = {
  futsal_a: { label: '체육진흥원 풋살장 A코트', sport: '풋살' },
  futsal_b: { label: '체육진흥원 풋살장 B코트', sport: '풋살' },
  basketball_a: { label: '체육진흥원 농구장 A코트', sport: '농구' },
  basketball_b: { label: '체육진흥원 농구장 B코트', sport: '농구' },
  soccer_field: { label: '체육진흥원 대운동장 (축구장)', sport: '축구' },
  sub_field: { label: '체육진흥원 소운동장 (보조구장)', sport: '축구' },
};

function MatchWriteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationDetails, setReservationDetails] = useState<any>(null);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 인라인 예약 연동 선택기 상태
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  // URL에서 reservationId 파라미터 로드
  useEffect(() => {
    const resId = searchParams.get('reservationId');
    if (resId) {
      loadReservation(resId);
    }
  }, [searchParams]);

  const loadReservation = async (id: string) => {
    setLoadingReservation(true);
    try {
      const { data, error } = await supabase
        .from('sports_reservations')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        if (data.status !== 'available') {
          alert('해당 시설 예약 슬롯은 이미 예약 완료되었거나 사용할 수 없습니다.');
          router.replace('/match/write');
          return;
        }

        const details = FACILITY_MAP[data.facility];
        if (details) {
          setReservationId(id);
          setReservationDetails(data);
          setForm((prev) => ({
            ...prev,
            sport: details.sport,
            location: details.label,
            matchDate: data.reservation_date,
            matchTime: data.start_time.substring(0, 5), // 'HH:MM'
          }));
        }
      }
    } catch (err) {
      console.error('Error loading reservation:', err);
    } finally {
      setLoadingReservation(false);
    }
  };

  // 선택된 종목에 따른 예약 가능 슬롯 목록 조회
  const fetchAvailableSlots = async (selectedSport: Sport) => {
    setLoadingSlots(true);
    try {
      const facilities = Object.entries(FACILITY_MAP)
        .filter(([_, info]) => info.sport === selectedSport)
        .map(([key]) => key);

      if (facilities.length === 0) {
        setAvailableSlots([]);
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('sports_reservations')
        .select('*')
        .eq('status', 'available')
        .in('facility', facilities)
        .gte('reservation_date', todayStr)
        .order('reservation_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (!error && data) {
        setAvailableSlots(data);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error('Error fetching available slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSportSelect = (sport: Sport) => {
    if (reservationId) return; // 연동 시 변경 불가

    const presets = MATCH_SIZE_PRESETS[sport];
    setForm((prev) => ({
      ...prev,
      sport,
      matchSize: presets?.[0] || prev.matchSize,
      location: '',
      matchDate: '',
      matchTime: '',
    }));
    setReservationId(null);
    setReservationDetails(null);
    setShowSlotPicker(false);
  };

  const handleLinkReservation = (slot: any) => {
    const details = FACILITY_MAP[slot.facility];
    if (details) {
      setReservationId(slot.id);
      setReservationDetails(slot);
      setForm((prev) => ({
        ...prev,
        location: details.label,
        matchDate: slot.reservation_date,
        matchTime: slot.start_time.substring(0, 5),
      }));
      setShowSlotPicker(false);
    }
  };

  const handleUnlink = () => {
    setReservationId(null);
    setReservationDetails(null);
    setForm((prev) => ({
      ...prev,
      location: '',
      matchDate: '',
      matchTime: '',
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

      // 최종 DB 등록 전, 선택한 예약 슬롯이 여전히 available한지 실시간 이중 잠금 검사
      if (reservationId) {
        const { data: currentSlot, error: checkError } = await supabase
          .from('sports_reservations')
          .select('status')
          .eq('id', reservationId)
          .single();

        if (checkError || !currentSlot || currentSlot.status !== 'available') {
          alert('선택하신 체육시설 예약 슬롯이 이미 마감되었거나 사용할 수 없습니다. 다른 슬롯을 다시 선택해 주세요.');
          setIsSubmitting(false);
          return;
        }
      }

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
        reservation_id: reservationId,
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

  const inputClass = (field: string, disabled = false) =>
    `w-full px-4 py-3 rounded-xl border ${
      errors[field] ? 'border-danger bg-danger/5' : 'border-border'
    } ${disabled ? 'bg-bg text-muted cursor-not-allowed border-dashed' : 'bg-white text-text'} placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm`;

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

      {loadingReservation ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm text-text-secondary">체육진흥원 예약 현황 동기화 중...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6">
          {/* 예약 연동 배지 안내 */}
          {reservationId && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex items-center justify-between text-success animate-fade-in">
              <div className="flex items-center gap-2.5">
                <Link2 className="w-5 h-5 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">체육진흥원 실시간 예약 연동 완료</span>
                  <span className="text-[11px] block mt-0.5 text-success/80">장소, 날짜, 시간 정보가 보호 상태로 잠겨 있습니다.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUnlink}
                className="flex items-center gap-1 px-3 py-1.5 bg-success/20 hover:bg-success/30 rounded-lg text-xs font-bold transition-all"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>연동 해제</span>
              </button>
            </div>
          )}

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
                  disabled={!!reservationId}
                  onClick={() => handleSportSelect(sport.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    form.sport === sport.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card text-text-secondary hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl">{sport.emoji}</span>
                  <span className="text-xs font-semibold">{sport.label}</span>
                </button>
              ))}
            </div>
            {errors.sport && <p className="mt-1 text-xs text-danger">{errors.sport}</p>}
          </div>

          {/* 체육진흥원 간편 연동 선택 (종목 선택 시 노출) */}
          {form.sport && !reservationId && (form.sport === '풋살' || form.sport === '농구') && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-3">
              <div className="flex items-start gap-2 text-primary">
                <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">체육진흥원 예약 데이터 연동하기</h4>
                  <p className="text-[11px] mt-0.5 text-text-secondary">
                    크롤러가 동기화한 사용 가능한 예약을 장소와 시간으로 불러와 간편하게 글을 작성할 수 있습니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSlotPicker(!showSlotPicker);
                  if (!showSlotPicker) fetchAvailableSlots(form.sport as Sport);
                }}
                className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-light transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                {showSlotPicker ? '슬롯 선택기 닫기' : '사용 가능한 예약 조회'}
              </button>

              {showSlotPicker && (
                <div className="bg-card rounded-lg border border-border p-3 mt-2 max-h-[220px] overflow-y-auto space-y-2 scrollbar-thin">
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-[11px] text-muted text-center py-4">사용 가능한 체육시설 공석이 없습니다. 직접 장소를 입력해 주세요.</p>
                  ) : (
                    availableSlots.map((slot) => {
                      const dateObj = new Date(slot.reservation_date);
                      const dateLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
                      const label = FACILITY_MAP[slot.facility]?.label || '체육시설';
                      return (
                        <div
                          key={slot.id}
                          onClick={() => handleLinkReservation(slot)}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-white hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-text">{label}</span>
                            <span className="text-[10px] text-muted mt-0.5">{dateLabel} ({slot.start_time.substring(0, 5)} ~ {slot.end_time.substring(0, 5)})</span>
                          </div>
                          <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded">선택</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      form.matchSize === preset
                        ? 'bg-primary text-white shadow-sm'
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
            <div className="relative">
              <input
                type="text"
                placeholder="장소를 입력하세요 (예: 풋살장 A)"
                value={form.location}
                disabled={!!reservationId}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={inputClass('location', !!reservationId)}
              />
              {reservationId && (
                <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
              )}
            </div>
            {errors.location && <p className="mt-1 text-xs text-danger">{errors.location}</p>}
          </div>

          {/* 날짜·시간 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">날짜</label>
              <input
                type="date"
                value={form.matchDate}
                disabled={!!reservationId}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
                className={inputClass('matchDate', !!reservationId)}
              />
              {errors.matchDate && <p className="mt-1 text-xs text-danger">{errors.matchDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">시간</label>
              <input
                type="time"
                value={form.matchTime}
                disabled={!!reservationId}
                onChange={(e) => setForm({ ...form, matchTime: e.target.value })}
                className={inputClass('matchTime', !!reservationId)}
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
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    form.requiredLevel === level.value
                      ? 'border-transparent text-text shadow-sm'
                      : 'border-border bg-card text-text-secondary hover:border-primary/20'
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
            className="w-full py-3.5 bg-accent text-white font-bold rounded-xl hover:bg-accent-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
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
      )}
    </div>
  );
}

export default function MatchWritePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 max-w-2xl mx-auto bg-card rounded-2xl border border-border">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
        <p className="text-sm text-text-secondary">작성 양식 불러오는 중...</p>
      </div>
    }>
      <MatchWriteForm />
    </Suspense>
  );
}

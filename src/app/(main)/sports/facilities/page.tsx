'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Clock, MapPin, AlertCircle, RefreshCw, ChevronRight, Swords } from 'lucide-react';

interface ReservationSlot {
  id: string;
  facility: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'reserved' | 'closed';
  crawled_at: string;
}

const FACILITIES = [
  { value: 'futsal_a', label: '🥅 풋살장 A코트', sport: '풋살' },
  { value: 'futsal_b', label: '🥅 풋살장 B코트', sport: '풋살' },
  { value: 'basketball_a', label: '🏀 농구장 A코트', sport: '농구' },
  { value: 'basketball_b', label: '🏀 농구장 B코트', sport: '농구' },
  { value: 'soccer_field', label: '⚽ 대운동장 (축구장)', sport: '축구' },
  { value: 'sub_field', label: '⚽ 소운동장 (보조구장)', sport: '축구' },
];

function getKstNow(): Date {
  const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 9);
}

export default function SportsFacilitiesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeFacility, setActiveFacility] = useState('futsal_a');
  const [activeDate, setActiveDate] = useState('');
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // 1. 향후 7일 KST 날짜 생성
  const dates: { dateStr: string; label: string; weekday: string }[] = [];
  const kstNow = getKstNow();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  for (let i = 0; i < 7; i++) {
    const target = new Date(kstNow.getTime() + i * 24 * 60 * 60000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    let label = `${target.getMonth() + 1}/${target.getDate()}`;
    if (i === 0) label = '오늘';
    else if (i === 1) label = '내일';

    dates.push({
      dateStr,
      label,
      weekday: weekdays[target.getDay()],
    });
  }

  // 초기 오늘 날짜 설정
  useEffect(() => {
    if (dates.length > 0) {
      setActiveDate(dates[0].dateStr);
    }
  }, []);

  // 2. 예약 데이터 조회
  useEffect(() => {
    if (!activeDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sports_reservations')
        .select('*')
        .eq('facility', activeFacility)
        .eq('reservation_date', activeDate)
        .order('start_time', { ascending: true });

      if (!error && data) {
        setSlots(data as ReservationSlot[]);
        if (data.length > 0) {
          const syncTime = new Date(data[0].crawled_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
          const syncDate = new Date(data[0].crawled_at).toLocaleDateString('ko-KR', {
            month: 'numeric',
            day: 'numeric',
          });
          setLastSync(`${syncDate} ${syncTime}`);
        } else {
          setLastSync(null);
        }
      } else {
        setSlots([]);
        setLastSync(null);
      }
      setLoading(false);
    };

    fetchSlots();
  }, [activeFacility, activeDate]);

  const handleSelectSlot = (slot: ReservationSlot) => {
    if (slot.status !== 'available') return;
    router.push(`/match/write?reservationId=${slot.id}`);
  };

  const getStatusColor = (status: 'available' | 'reserved' | 'closed') => {
    switch (status) {
      case 'available':
        return 'bg-success/10 border-success/30 hover:border-success hover:bg-success/20 text-success cursor-pointer';
      case 'reserved':
        return 'bg-muted/5 border-border text-muted cursor-not-allowed opacity-60';
      case 'closed':
        return 'bg-danger/5 border-danger/10 text-danger/70 cursor-not-allowed opacity-60';
      default:
        return '';
    }
  };

  const getStatusText = (status: 'available' | 'reserved' | 'closed') => {
    switch (status) {
      case 'available':
        return '매치 생성 가능 (예약 비어있음)';
      case 'reserved':
        return '예약 완료 (매치 불가능)';
      case 'closed':
        return '운영 불가';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text">체육시설 실시간 예약현황</h1>
          <p className="text-sm text-text-secondary mt-1">
            충북대학교 체육진흥원 시스템의 실시간 공석 현황을 불러옵니다.
          </p>
        </div>
        {lastSync && (
          <div className="flex items-center gap-2 self-start md:self-auto bg-card px-4 py-2 border border-border rounded-xl shadow-sm text-xs font-semibold text-text-secondary">
            <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin-slow" />
            <span>최근 동기화: {lastSync} (1시간 주기 자동 업데이트)</span>
          </div>
        )}
      </div>

      {/* Facility Select Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {FACILITIES.map((fac) => (
          <button
            key={fac.value}
            onClick={() => setActiveFacility(fac.value)}
            className={`py-3 px-4 rounded-xl font-semibold border-2 transition-all text-sm shadow-sm ${
              activeFacility === fac.value
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-text-secondary hover:border-primary/20'
            }`}
          >
            {fac.label}
          </button>
        ))}
      </div>

      {/* Date Select Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {dates.map((d) => (
          <button
            key={d.dateStr}
            onClick={() => setActiveDate(d.dateStr)}
            className={`shrink-0 flex flex-col items-center gap-1.5 py-2.5 px-5 rounded-2xl border transition-all ${
              activeDate === d.dateStr
                ? 'bg-primary text-white border-transparent shadow-md transform -translate-y-0.5 font-bold'
                : 'bg-card border-border text-text-secondary hover:border-primary/30'
            }`}
          >
            <span className="text-[10px] uppercase font-semibold">{d.weekday}</span>
            <span className="text-sm">{d.label}</span>
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2 font-bold text-text">
            <Clock className="w-5 h-5 text-primary" />
            <span>시간대별 현황</span>
          </div>
          <span className="text-xs text-muted">원하는 빈 시간대(초록색)를 선택하여 즉시 매치를 개설해 보세요.</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-danger" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">예약 데이터를 찾을 수 없습니다</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto mb-6">
              해당 날짜에 대한 체육진흥원 스케줄이 아직 열리지 않았거나 크롤러 동기화 대기 중입니다.
            </p>
            <button
              onClick={() => router.push('/match/write')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-dark transition-all"
            >
              <span>수동으로 매치글 작성하기</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slots.map((slot) => {
              const isAvail = slot.status === 'available';
              return (
                <div
                  key={slot.id}
                  onClick={() => handleSelectSlot(slot)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${getStatusColor(
                    slot.status
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${isAvail ? 'bg-success/20' : 'bg-muted/10'}`}>
                      <Swords className={`w-4 h-4 ${isAvail ? 'text-success' : 'text-text-secondary'}`} />
                    </div>
                    <div>
                      <span className="text-sm font-bold block text-text">
                        {slot.start_time} ~ {slot.end_time}
                      </span>
                      <span className="text-[11px] block mt-0.5 font-medium">{getStatusText(slot.status)}</span>
                    </div>
                  </div>
                  {isAvail && (
                    <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 text-success" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

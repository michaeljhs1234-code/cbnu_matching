import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const SERVICES: Record<string, string> = {
  futsal_a:      'lMSUwWWYZcNpkZTEZ8NtxGSQmZCTlG2Xkmpv',  // 풋살장 A코트
  futsal_b:      'lMSUwWWYZcNpkZTEZ8NtxGSQmZCTlG2Xkmpv',  // 풋살장 B코트
  basketball_a:  'mcSVwWaYZ8NkkZLEbMNwxGiQk5CTlG2Xkmpv',  // 농구장 A코트
  basketball_b:  'mcSVwWaYZ8NkkZLEbMNwxGiQk5CTlG2Xkmpv',  // 농구장 B코트
  soccer_field:  'TODO_FILL_SOCCER_FIELD_CODE',            // 대운동장 (축구장)
  sub_field:     'TODO_FILL_SUB_FIELD_CODE',               // 소운동장 (보조구장)
  tennis_a:      'TODO_FILL_TENNIS_A_CODE',                // 테니스장 A코트
  tennis_b:      'TODO_FILL_TENNIS_B_CODE',                // 테니스장 B코트
  tennis_c:      'TODO_FILL_TENNIS_C_CODE',                // 테니스장 C코트
  tennis_d:      'TODO_FILL_TENNIS_D_CODE',                // 테니스장 D코트
  tennis_e:      'TODO_FILL_TENNIS_E_CODE',                // 테니스장 E코트
};

const COURT_INDEX: Record<string, number> = {
  futsal_a:     0,
  futsal_b:     1,
  basketball_a: 0,
  basketball_b: 1,
  soccer_field: 0,
  sub_field:    0,
  tennis_a:     0,
  tennis_b:     1,
  tennis_c:     2,
  tennis_d:     3,
  tennis_e:     4,
};

const FACILITY_HOURS: Record<string, [number, number]> = {
  futsal_a:      [6, 22],
  futsal_b:      [6, 22],
  basketball_a:  [6, 22],
  basketball_b:  [6, 22],
  soccer_field:  [6, 22],
  sub_field:     [6, 22],
  tennis_a:      [6, 22],
  tennis_b:      [6, 22],
  tennis_c:      [6, 22],
  tennis_d:      [6, 22],
  tennis_e:      [6, 22],
};

function getKstNow(): Date {
  const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 9);
}

function getKstIsoString(date: Date): string {
  // Convert date to KST format manually to ensure correct timezone
  const offset = 9 * 60; // KST is UTC+9
  const localTime = date.getTime() + (offset + date.getTimezoneOffset()) * 60000;
  return new Date(localTime).toISOString().replace('Z', '+09:00');
}

export async function GET(request: Request) {
  // CRON_SECRET 인증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const username = process.env.SPORTS_USERNAME;
  const password = process.env.SPORTS_PASSWORD;

  if (!username || !password) {
    console.error('sync-sports: Credentials missing in environment variables');
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  try {
    const supabase = await createServiceClient();

    // 1. 오래된 예약 슬롯 정리 (어제 이전)
    const kstNow = getKstNow();
    const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60000);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    await supabase
      .from('sports_reservations')
      .delete()
      .lt('reservation_date', yesterdayStr);

    // 2. 충북대 스포츠 웹사이트 로그인 시도
    console.log('sync-sports: Logging in to sports.cbnu.ac.kr...');
    const loginUrl = 'https://sports.cbnu.ac.kr/index.php?mid=cbnu_main&act=procMemberLogin';
    const loginBody = new URLSearchParams({
      user_id: username,
      password: password,
      module: 'member',
      act: 'procMemberLogin',
      mid: 'cbnu_main',
    });

    const loginResp = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: loginBody.toString(),
      cache: 'no-store',
    });

    const cookies = loginResp.headers.getSetCookie();
    const cookieStr = cookies.map((c) => c.split(';')[0]).join('; ');

    if (!cookieStr || !cookieStr.includes('xe_logged')) {
      console.warn('sync-sports: Login failed or xe_logged cookie not found. Proceeding with limited/public visibility.');
    } else {
      console.log('sync-sports: Login successful!');
    }

    // 3. 향후 7일 날짜 준비
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const target = new Date(kstNow.getTime() + i * 24 * 60 * 60000);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, '0');
      const dd = String(target.getDate()).padStart(2, '0');
      dates.push(`${yyyy}${mm}${dd}`);
    }

    const apiCache: Record<string, any> = {};
    const allSlots: any[] = [];

    // 4. 각 시설 및 날짜에 대해 스케줄 크롤링
    for (const [facilityType, code] of Object.entries(SERVICES)) {
      if (code.startsWith('TODO')) {
        console.warn(`sync-sports: Skipping ${facilityType} because code hash is not configured yet.`);
        continue;
      }
      const courtIdx = COURT_INDEX[facilityType];
      const hours = FACILITY_HOURS[facilityType];

      for (const d of dates) {
        const cacheKey = `${code}_${d}`;
        let data: any;

        if (apiCache[cacheKey]) {
          data = apiCache[cacheKey];
        } else {
          const scheduleBody = new URLSearchParams({
            code: code,
            days: d,
            module: 'its',
            act: 'get_schedule',
          });

          try {
            const scheduleResp = await fetch('https://sports.cbnu.ac.kr/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'X-Requested-With': 'XMLHttpRequest',
              },
              body: scheduleBody.toString(),
              cache: 'no-store',
            });

            if (scheduleResp.ok) {
              data = await scheduleResp.json();
              apiCache[cacheKey] = data;
            }
          } catch (err) {
            console.error(`sync-sports: Error fetching schedule for ${facilityType} on ${d}:`, err);
            continue;
          }
        }

        if (!data) continue;

        const formattedDate = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6)}`;
        const dateKey = `day_${formattedDate}`;
        const dayItems = data[dateKey];

        if (!dayItems || !Array.isArray(dayItems) || courtIdx >= dayItems.length) {
          continue;
        }

        const item = dayItems[courtIdx];
        const msg = item.msg || '';
        if (msg.includes('예약가능한 날짜가 아닙니다')) {
          continue;
        }

        const unavailable = item.unavailable || [];
        const [startHour, endHour] = hours;

        const isUnavailable = (h: number) => {
          return unavailable.some((unav: string) => {
            const timePart = unav.includes(':') ? unav.split(':')[0] : unav;
            const timePartClean = timePart.replace(/:/g, '-');
            if (timePartClean.includes('-')) {
              try {
                const unavHour = parseInt(timePartClean.split('-')[0], 10);
                return unavHour === h;
              } catch {
                return false;
              }
            }
            return false;
          });
        };

        for (let h = startHour; h < endHour; h++) {
          const slotStart = `${String(h).padStart(2, '0')}:00`;
          const slotEnd = (endHour === 22 && h === 21) ? '21:50' : `${String(h + 1).padStart(2, '0')}:00`;

          allSlots.push({
            facility: facilityType,
            reservation_date: formattedDate,
            start_time: slotStart,
            end_time: slotEnd,
            status: isUnavailable(h) ? 'reserved' : 'available',
            crawled_at: getKstIsoString(kstNow),
          });
        }
      }
    }

    // 5. Supabase Upsert 실행
    console.log(`sync-sports: Upserting ${allSlots.length} reservation slots into Supabase...`);
    let upsertedCount = 0;
    
    if (allSlots.length > 0) {
      const { error: upsertError } = await supabase
        .from('sports_reservations')
        .upsert(allSlots, {
          onConflict: 'facility,reservation_date,start_time',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('sync-sports: Upsert failed:', upsertError);
        return NextResponse.json({ error: 'Database upsert failed', details: upsertError }, { status: 500 });
      }
      upsertedCount = allSlots.length;
    }

    return NextResponse.json({
      success: true,
      upserted: upsertedCount,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error('sync-sports: Unhandled exception:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err?.message }, { status: 500 });
  }
}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. .env.local 수동 파싱
const envPath = path.resolve(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local 파일이 존재하지 않습니다.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const username = env.SPORTS_USERNAME;
const password = env.SPORTS_PASSWORD;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!username || username.includes('실제') || !password || password.includes('실제')) {
  console.error('\n[오류] .env.local 파일에 실제 충북대 학번과 비밀번호를 입력해 주세요!');
  console.log('현재 설정값:');
  console.log(`- SPORTS_USERNAME: ${username}`);
  console.log(`- SPORTS_PASSWORD: ${password ? '*** (비밀번호 입력됨)' : '비어있음'}`);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase 환경 변수가 누락되었습니다.');
  process.exit(1);
}

const SERVICES = {
  futsal_a:      'lMSUwWWYZcNpkZTEZ8NtxGSQmZCTlG2Xkmpv',  // 풋살장 A코트
  futsal_b:      'lMSUwWWYZcNpkZTEZ8NtxGSQmZCTlG2Xkmpv',  // 풋살장 B코트
  basketball_a:  'mcSVwWaYZ8NkkZLEbMNwxGiQk5CTlG2Xkmpv',  // 농구장 A코트
  basketball_b:  'mcSVwWaYZ8NkkZLEbMNwxGiQk5CTlG2Xkmpv',  // 농구장 B코트
  // 테니스/대운동장/소운동장은 고유 코드가 필요하므로 임시 스킵 처리
};

const COURT_INDEX = {
  futsal_a:     0,
  futsal_b:     1,
  basketball_a: 0,
  basketball_b: 1,
};

const FACILITY_HOURS = {
  futsal_a:      [6, 22],
  futsal_b:      [6, 22],
  basketball_a:  [6, 22],
  basketball_b:  [6, 22],
};

function getKstNow() {
  const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 9);
}

function getKstIsoString(date) {
  const offset = 9 * 60;
  const localTime = date.getTime() + (offset + date.getTimezoneOffset()) * 60000;
  return new Date(localTime).toISOString().replace('Z', '+09:00');
}

async function run() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('--- 1. 오래된 예약 슬롯 정리 (어제 이전) ---');
  const kstNow = getKstNow();
  const yesterday = new Date(kstNow.getTime() - 24 * 60 * 60000);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  const { error: delError } = await supabase
    .from('sports_reservations')
    .delete()
    .lt('reservation_date', yesterdayStr);
  
  if (delError) console.error('이전 슬롯 삭제 오류:', delError);

  console.log('\n--- 2. 충북대 체육진흥원 로그인 시도 ---');
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
  });

  const cookies = loginResp.headers.getSetCookie();
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');

  if (!cookieStr || !cookieStr.includes('xe_logged')) {
    console.error('로그인 실패! 학번 또는 개신누리 비밀번호를 확인해 주세요.');
    process.exit(1);
  }
  console.log('로그인 성공!');

  // 향후 7일 날짜 준비
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const target = new Date(kstNow.getTime() + i * 24 * 60 * 60000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    dates.push(`${yyyy}${mm}${dd}`);
  }

  const apiCache = {};
  const allSlots = [];

  console.log('\n--- 3. 시설별 실시간 예약 조회 시작 (향후 7일) ---');
  for (const [facilityType, code] of Object.entries(SERVICES)) {
    const courtIdx = COURT_INDEX[facilityType];
    const hours = FACILITY_HOURS[facilityType];
    console.log(`시설 조회 중: ${facilityType}...`);

    for (const d of dates) {
      const cacheKey = `${code}_${d}`;
      let data;

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
          });

          if (scheduleResp.ok) {
            data = await scheduleResp.json();
            apiCache[cacheKey] = data;
          }
        } catch (err) {
          console.error(`스케줄 조회 에러 (${facilityType}, ${d}):`, err.message);
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

      const isUnavailable = (h) => {
        return unavailable.some(unav => {
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

  console.log(`\n--- 4. Supabase DB에 ${allSlots.length}개 예약 슬롯 동기화 중 ---`);
  if (allSlots.length > 0) {
    const { error: upsertError } = await supabase
      .from('sports_reservations')
      .upsert(allSlots, {
        onConflict: 'facility,reservation_date,start_time',
      });

    if (upsertError) {
      console.error('동기화 실패:', upsertError);
    } else {
      console.log('실시간 동기화 완료! 웹사이트 예약 현황판에서 확인해 보세요.');
    }
  } else {
    console.log('동기화할 스케줄이 없습니다.');
  }
}

run().catch(console.error);

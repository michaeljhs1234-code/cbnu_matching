"""
충북대 매칭 플랫폼 - 시설 예약 현황 크롤러
대상: sports.cbnu.ac.kr (충북대 스포츠 시설 예약 시스템)
실행: GitHub Actions - 매 1시간마다
인증: 충북대 계정 세션 기반
"""

import os
import time
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Optional

def get_kst_now():
    return datetime.now(timezone(timedelta(hours=9)))

import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# .env.local을 프로젝트 루트에서 찾아 로드 (경로 범용성 증대)
dotenv_path = os.path.join(os.path.dirname(__file__), '../.env.local')
load_dotenv(dotenv_path)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY', '')

def supabase_upsert(table: str, data: list, on_conflict: str):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    resp = requests.post(url, json=data, headers=headers)
    resp.raise_for_status()
    return resp

# 시설 코드 매핑 (코트별 분리)
# API 실제 검증 결과 기준 (2026-05-30)
# - 풋살(A/B), 농구(A/B): 동일 코드 공유, day_items 인덱스로 구분
# - 테니스: C,D,E코트 → 코드 'mMSbwWGY...' (day_items 0,1,2)
#           A,B코트  → TODO: 학교 내부망 접속 후 Network 탭에서 get_schedule code 확인 필요
# - 종합운동장·소운동장: 단일 시설
SERVICES = {
    'futsal_a':      'lMSUwWWYZcNpkZTEZ8NtxGSQmZCTlG2Xkmpv',  # 풋살장 A코트
    'futsal_b':      'lMSUwWWYZcNpkZTEZ8NtxGSQmZCTlG2Xkmpv',  # 풋살장 B코트
    'basketball_a':  'mcSVwWaYZ8NkkZLEbMNwxGiQk5CTlG2Xkmpv',  # 농구장 A코트
    'basketball_b':  'mcSVwWaYZ8NkkZLEbMNwxGiQk5CTlG2Xkmpv',  # 농구장 B코트
}

# 코트 인덱스 매핑: 동일 API에서 코트별 day_items 리스트 순서 기반 (0-indexed)
COURT_INDEX = {
    'futsal_a':     0,
    'futsal_b':     1,
    'basketball_a': 0,
    'basketball_b': 1,
}

# 시설별 학내구성원 운영시간 (start_hour, end_hour)
# end_hour=22 → 마지막 슬롯 21:00~21:50 (50분 단위)
FACILITY_HOURS = {
    'futsal_a':      (6,  22),  # 풋살 A:    06:00 ~ 21:50
    'futsal_b':      (6,  22),  # 풋살 B:    06:00 ~ 21:50
    'basketball_a':  (6,  22),  # 농구 A:    06:00 ~ 21:50
    'basketball_b':  (6,  22),  # 농구 B:    06:00 ~ 21:50
}

BASE_URL = 'https://sports.cbnu.ac.kr/'
SESSION = requests.Session()


def login() -> bool:
    """충북대 스포츠 사이트 로그인 → PHPSESSID 획득"""
    login_url = BASE_URL + 'index.php?mid=cbnu_main&act=procMemberLogin'
    payload = {
        'user_id': os.environ['SPORTS_USERNAME'],
        'password': os.environ['SPORTS_PASSWORD'],
        'module': 'member',
        'act': 'procMemberLogin',
        'mid': 'cbnu_main',
    }
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': BASE_URL,
        'Referer': BASE_URL,
        'X-Requested-With': 'XMLHttpRequest',
    }

    try:
        resp = SESSION.post(login_url, data=payload, headers=headers, timeout=15)
        # 로그인 성공 여부 확인 (xe_logged 쿠키 존재)
        if 'xe_logged' in SESSION.cookies or resp.status_code == 200:
            logger.info("로그인 성공")
            return True
        logger.error(f"로그인 실패: status={resp.status_code}")
        return False
    except Exception as e:
        logger.error(f"로그인 네트워크 오류 (학교 방화벽 차단 가능성 매우 높음): {e}")
        import socket
        try:
            host = "sports.cbnu.ac.kr"
            ip = socket.gethostbyname(host)
            logger.info(f"DNS 조회 성공: {host} -> {ip} (서버는 존재하나 포트가 막혔을 수 있습니다.)")
        except Exception as dns_e:
            logger.error(f"DNS 조회 실패 (네트워크 연결이 끊겼거나 DNS가 유효하지 않습니다): {dns_e}")
        return False


def get_schedule(facility_type: str, code: str, target_date: str,
                 api_cache: dict | None = None) -> list[dict]:
    """
    특정 날짜의 예약 스케줄 조회 (코트별 분리 지원, API 응답 캐싱)

    api_cache: {(code, target_date): raw_data} 형태의 딕셔너리.
      동일 (code, date)는 한 번만 API 호출하고 캐시 재사용.
      풋살A/B, 농구A/B가 같은 코드를 공유하므로 호출 횟수 대폭 감소.
    """
    court_idx = COURT_INDEX.get(facility_type)
    formatted_date = f"{target_date[:4]}-{target_date[4:6]}-{target_date[6:]}"
    date_key = f"day_{formatted_date}"
    cache_key = (code, target_date)

    # 캐시 확인: 이미 같은 (code, date)로 호출한 적 있으면 재사용
    if api_cache is not None and cache_key in api_cache:
        data = api_cache[cache_key]
        logger.debug(f"  {facility_type} {target_date}: 캐시 히트")
    else:
        headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': BASE_URL,
            'Referer': f'{BASE_URL}index.php?act=dispFacilityView&code={code}',
            'X-Requested-With': 'XMLHttpRequest',
        }
        payload = f'code={code}&days={target_date}&module=its&act=get_schedule'

        try:
            resp = SESSION.post(BASE_URL, data=payload, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if api_cache is not None:
                api_cache[cache_key] = data
        except Exception as e:
            logger.error(f"get_schedule API 오류 ({facility_type}, {target_date}): {e}")
            return []

    try:
        day_items = data.get(date_key)
        if not day_items or not isinstance(day_items, list):
            logger.debug(f"  {facility_type} {target_date}: 응답 데이터 없음 (예약 미오픈 날짜일 가능성)")
            return []

        # 코트 선택
        if court_idx is None:
            items_to_process = day_items
        else:
            if court_idx >= len(day_items):
                logger.debug(f"  {facility_type} {target_date}: court_idx={court_idx} >= day_items 길이({len(day_items)}) - 코트 없음")
                return []
            items_to_process = [day_items[court_idx]]

        # 시설별 운영시간을 FACILITY_HOURS 딕셔너리에서 가져옴 (학내구성원 기준)
        fac_hours = FACILITY_HOURS.get(facility_type)

        slots = []
        for item in items_to_process:
            unavailable = item.get('unavailable', [])  # 예: ["08-00", "09-00"]
            msg = item.get('msg', '')

            # 날짜 자체가 예약 미오픈인 경우 → DB 저장 안 함
            if "예약가능한 날짜가 아닙니다" in msg:
                logger.debug(f"  {facility_type} {target_date}: 예약 미오픈 날짜 - 스킵")
                return []

            # 운영시간 결정: FACILITY_HOURS 우선, 없으면 API time_s/time_e 사용
            if fac_hours:
                start_hour, end_hour = fac_hours
            else:
                time_s = item.get('time_s', '')
                time_e = item.get('time_e', '')
                if not time_s or not time_e:
                    continue
                start_hour = int(time_s.split(":")[0])
                end_hour   = int(time_e.split(":")[0])

            try:
                for h in range(start_hour, end_hour):
                    slot_start = f"{h:02d}:00"
                    # 21시 슬롯은 50분 단위로 종료 (06~21:50 운영 시설)
                    if end_hour == 22 and h == 21:
                        slot_end = "21:50"
                    else:
                        slot_end = f"{h+1:02d}:00"

                    # unavailable 정밀 매칭
                    is_unavailable = False
                    for unav in unavailable:
                        if ":" in unav:
                            time_part = unav.split(":")[0]
                        else:
                            time_part = unav

                        time_part_clean = time_part.replace(":", "-")
                        if "-" in time_part_clean:
                            try:
                                unav_hour = int(time_part_clean.split("-")[0])
                                if unav_hour == h:
                                    is_unavailable = True
                                    break
                            except ValueError:
                                pass

                    slots.append({
                        'facility': facility_type,
                        'reservation_date': formatted_date,
                        'start_time': slot_start,
                        'end_time': slot_end,
                        'status': 'reserved' if is_unavailable else 'available',
                        'crawled_at': get_kst_now().isoformat(),  # DB 스키마 'crawled_at'에 맞춰 수정 완료
                    })

            except Exception as parse_e:
                logger.error(f"시간 파싱 오류 ({facility_type}, {target_date}): {parse_e}")

        return slots

    except Exception as e:
        logger.error(f"get_schedule 파싱 오류 ({facility_type}, {target_date}): {e}")
        return []


def upsert_slots(slots: list[dict]) -> int:
    """예약 슬롯 Supabase upsert"""
    if not slots:
        return 0
    try:
        supabase_upsert('sports_reservations', slots, on_conflict='facility,reservation_date,start_time')
        return len(slots)
    except Exception as e:
        logger.error(f"슬롯 upsert 오류: {e}")
        return 0


def crawl_all():
    """전체 시설 × 오늘~7일 크롤링"""
    if not login():
        logger.error("로그인 실패로 크롤링 중단")
        return

    today = get_kst_now().date()
    dates = [(today + timedelta(days=i)).strftime('%Y%m%d') for i in range(7)]
    logger.info(f"크롤링 대상 날짜: {dates[0]} ~ {dates[-1]} (7일치)")

    api_cache: dict = {}  # {(code, date): raw_json} - 중복 API 호출 방지
    total = 0
    seen_codes: set = set()

    for facility_type, code in SERVICES.items():
        logger.info(f"--- {facility_type} 크롤링 시작 ---")
        for d in dates:
            cache_key = (code, d)
            is_cache_hit = cache_key in api_cache

            slots = get_schedule(facility_type, code, d, api_cache)
            count = upsert_slots(slots)
            total += count

            if is_cache_hit:
                logger.info(f"  {d}: {count}슬롯 저장 [캐시 사용]")
            else:
                logger.info(f"  {d}: {count}슬롯 저장 [API 호출]")
                seen_codes.add(cache_key)
                time.sleep(0.3)

    unique_calls = len(seen_codes)
    logger.info(f"총 {total}개 슬롯 처리 완료 (실제 API 호출: {unique_calls}회)")


if __name__ == '__main__':
    logger.info("===== 시설 예약 크롤러 시작 =====")
    start = get_kst_now()
    crawl_all()
    elapsed = (get_kst_now() - start).seconds
    logger.info(f"===== 크롤링 완료 ({elapsed}초) =====")

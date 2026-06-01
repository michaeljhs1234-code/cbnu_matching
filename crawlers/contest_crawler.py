"""
충북대 매칭 플랫폼 - 공모전 크롤러
대상: 공모전닷컴, 위비티, 링커리어
실행: GitHub Actions - 매일 KST 02:00 (UTC 17:00)
"""

import os
import re
import time
import logging
from datetime import datetime, date, timedelta, timezone

def get_kst_now():
    return datetime.now(timezone(timedelta(hours=9)))
from typing import Optional

import requests
from bs4 import BeautifulSoup
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

def supabase_upsert(table: str, data: dict, on_conflict: str):
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    resp = requests.post(url, json=data, headers=headers)
    if not resp.ok:
        logger.error(f"Supabase API Error: {resp.text}")
    resp.raise_for_status()
    return resp

def supabase_update(table: str, data: dict, conditions: dict):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = []
    for k, v in conditions.items():
        if k == 'lt_end_date':
            params.append(f"end_date=lt.{v}")
        elif k == 'eq_is_active':
            params.append(f"is_active=eq.{v}")
    
    if params:
        url += "?" + "&".join(params)
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    resp = requests.patch(url, json=data, headers=headers)
    resp.raise_for_status()
    return resp

# 분야 매핑 규칙
FIELD_KEYWORDS = {
    'marketing': ['마케팅', '아이디어', '광고', '홍보', 'PR', '브랜드'],
    'video': ['영상', 'UCC', '사진', '영화', '유튜브', '단편'],
    'design': ['디자인', 'UI', 'UX', '캐릭터', '타이포', '그래픽'],
    'literature': ['문학', '글쓰기', '시', '소설', '수필', '시나리오', '웹툰'],
    'it': ['IT', '소프트웨어', '개발', '해커톤', '앱', '인공지능', 'AI', '빅데이터', '블록체인'],
    'arts': ['예체능', '음악', '미술', '공연', '댄스', '사진', '조각'],
    'academic': ['학술', '창업', '논술', '스타트업', '논문', '정책', '사회'],
}

def map_field(title: str, category: str = '') -> str:
    """공모전 제목/카테고리로 분야 자동 매핑"""
    text = (title + ' ' + category).lower()
    for field, keywords in FIELD_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                return field
    return 'academic'  # 기본값

def is_target_region(contest: dict) -> bool:
    """주관 기관(organizer) 및 제목(title) 기준으로 대전, 세종, 충청 지역 판별"""
    organizer = contest.get('organizer', '') or ''
    title = contest.get('title', '') or ''
    
    text_to_check = f"{title} {organizer}".lower()

    # 명시적으로 전국/타 지역 키워드가 포함된 경우 제외 (순수 지역 공모전만)
    exclude_keywords = [
        '서울', '경기', '인천', '강원', '부산', '대구', '울산', '광주', 
        '경북', '경상북도', '경남', '경상남도', '전북', '전라북도', '전남', '전라남도', '제주', '전국'
    ]
    
    if any(kw in text_to_check for kw in exclude_keywords):
        # 단, 충청권 키워드가 같이 있으면 허용
        if not any(kw in text_to_check for kw in ['충북', '충남', '대전', '세종', '충청']):
            return False

    # 충청 대전 세종 지역 및 대학교/지자체 키워드
    target_keywords = [
        '대전', '세종', '충남', '충청남도', '충북', '충청북도', '충청', 
        '청주', '충주', '천안', '아산', '공주', '제천', '음성', '진천', '괴산', '증평', '보은', '옥천', '영동', '단양', 
        '홍성', '예산', '태안', '당진', '서산', '보령', '서천', '부여', '논산', '계룡', '금산',
        '충북대', '충남대', '한밭대', '목원대', '배재대', '대전대', '우송대', '서원대', '청주대', '청주교대', '공주교대', 
        '건양대', '순천향대', '백석대', '선문대', '호서대', '남서울대', '극동대', '중원대', '유원대', '세명대'
    ]
    
    for kw in target_keywords:
        if kw in text_to_check:
            return True
            
    return False

def upsert_contest(contest: dict) -> bool:
    """Supabase에 공모전 upsert (지역 필터링 적용 및 URL 기준 중복 방지)"""
    if not is_target_region(contest):
        logger.debug(f"지역 필터링 스킵: {contest.get('title', '')[:45]}... | 주최: {contest.get('organizer', 'N/A')}")
        return False

    try:
        # 지역 정보 추가 (region 컬럼이 필수이므로)
        region = _extract_region(contest)
        contest['region'] = region
        # external_contests 테이블에 upsert 하도록 완벽 수정
        supabase_upsert('external_contests', contest, on_conflict='url')
        logger.info(f"저장 성공: {contest.get('title', '')[:45]}... | 지역: {region} | 주최: {contest.get('organizer', 'N/A')}")
        return True
    except Exception as e:
        logger.error(f"Upsert 실패: {e} | URL: {contest.get('url', '')[:80]}")
        return False

def _extract_region(contest: dict) -> str:
    """공모전 제목 및 주최 정보에서 region 추출"""
    organizer = contest.get('organizer', '') or ''
    title = contest.get('title', '') or ''
    text = f"{title} {organizer}".lower()

    # 충청북도 관련 키워드
    if any(kw in text for kw in ['충북', '충청북도', '청주', '충주', '제천', '음성', '진천', '괴산', '증평', '보은', '옥천', '영동', '단양', '충북대', '서원대', '청주대', '세명대', '중원대', '유원대', '극동대']):
        return '충청북도'

    # 충청남도 관련 키워드
    if any(kw in text for kw in ['충남', '충청남도', '천안', '아산', '공주', '홍성', '예산', '태안', '당진', '서산', '보령', '서천', '부여', '논산', '계룡', '금산', '충남대', '건양대', '순천향대', '백석대', '선문대', '호서대', '남서울대']):
        return '충청남도'

    # 대전 관련 키워드
    if any(kw in text for kw in ['대전', '한밭대', '배재대', '대전대', '우송대', '목원대']):
        return '대전광역시'

    # 세종 관련 키워드
    if any(kw in text for kw in ['세종', '세종특별자치시']):
        return '세종특별자치시'

    return '충청권'

def delete_expired():
    """마감일(deadline) 지난 외부 공모전 자동 삭제"""
    from datetime import date
    today = get_kst_now().date().isoformat()
    # 테이블명을 external_contests, 컬럼명을 deadline으로 완벽 수정
    url = f"{SUPABASE_URL}/rest/v1/external_contests?deadline=lt.{today}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    try:
        resp = requests.delete(url, headers=headers)
        resp.raise_for_status()
        logger.info(f"만료 외부 공모전 자동 삭제 완료")
    except Exception as e:
        logger.error(f"만료 외부 공모전 삭제 오류: {e}")


# ================================================
# 공모전닷컴 크롤러
# ================================================
def crawl_contestkorea():
    """공모전닷컴 (www.contestkorea.com) 크롤링"""
    logger.info("=== 공모전닷컴 크롤링 시작 ===")
    base_url = 'https://www.contestkorea.com'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
    }

    count = 0
    for page in range(1, 6):  # 최대 5페이지
        try:
            url = f'{base_url}/sub/list.php?int_gbn=1&page={page}'
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            items = soup.select('.list_style_2 li')
            if not items:
                items = [li for li in soup.find_all("li") if li.find("div", class_="title") and li.find("ul", class_="host")]
                
            if not items:
                break

            for item in items:
                try:
                    title_el = item.select_one('.title .txt')
                    if not title_el:
                        title_el = item.select_one('.title a')
                    if not title_el:
                        continue

                    title = title_el.get_text(strip=True)
                    
                    link_el = item.select_one('.title a')
                    if not link_el:
                        continue
                    detail_url = base_url + link_el.get('href', '')

                    # 주최기관
                    organizer_el = item.select_one('.host .icon_1')
                    organizer = None
                    if organizer_el:
                        organizer = organizer_el.get_text(strip=True).replace('주최', '').strip().lstrip('.').strip()

                    # 분야 태그
                    category_el = item.select_one('.title .category')
                    category = category_el.get_text(strip=True) if category_el else ''

                    # 날짜 파싱
                    date_el = item.select_one('.date .step-1')
                    if not date_el:
                        date_el = item.select_one('.date')
                        
                    start_date = None
                    end_date = None
                    if date_el:
                        date_text = date_el.get_text(strip=True)
                        match = re.search(r'(\d{2})[.\-/](\d{2})~(\d{2})[.\-/](\d{2})', date_text)
                        if match:
                            start_month = match.group(1)
                            start_day = match.group(2)
                            end_month = match.group(3)
                            end_day = match.group(4)
                            current_year = get_kst_now().year
                            
                            if int(start_month) > int(end_month) and int(end_month) < get_kst_now().month:
                                start_year = current_year
                                end_year = current_year + 1
                            else:
                                start_year = current_year
                                end_year = current_year
                                
                            start_date = f"{start_year}-{start_month}-{start_day}"
                            end_date = f"{end_year}-{end_month}-{end_day}"

                    if not end_date:
                        continue

                    # external_contests DB 스키마에 완전히 부합하도록 컬럼 매핑 조정
                    contest = {
                        'title': title,
                        'organizer': organizer,
                        'field': map_field(title, category),
                        'start_date': start_date,
                        'end_date': end_date,
                        'deadline': end_date, # deadline 컬럼
                        'url': detail_url,
                        'is_active': True,
                        'source': 'contestkorea',
                    }

                    if upsert_contest(contest):
                        count += 1

                except Exception as e:
                    logger.warning(f"항목 파싱 오류: {e}")

            time.sleep(1)

        except Exception as e:
            logger.error(f"공모전닷컴 페이지 {page} 오류: {e}")

    logger.info(f"공모전닷컴: {count}건 처리 완료")


# ================================================
# 위비티 크롤러
# ================================================
def crawl_wevity():
    """위비티 (www.wevity.com) 크롤링"""
    logger.info("=== 위비티 크롤링 시작 ===")
    base_url = 'https://www.wevity.com'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
    }

    count = 0
    for page in range(1, 16):
        try:
            url = f'{base_url}/?c=find&s=1&gub=1&sGub=1&cate=1&page={page}'
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            items = soup.select('ul.list li')
            if not items:
                break

            for item in items:
                try:
                    if 'top' in item.get('class', []):
                        continue
                        
                    title_el = item.select_one('div.tit a')
                    if not title_el:
                        continue

                    title_a = BeautifulSoup(str(title_el), 'lxml').find('a')
                    span = title_a.find('span')
                    if span:
                        span.decompose()
                    title = title_a.get_text(strip=True)

                    href = title_el.get('href', '')
                    detail_url = base_url + '/' + href if not href.startswith('http') else href

                    # 카테고리
                    cat_el = item.select_one('div.tit div.sub-tit')
                    category = cat_el.get_text(strip=True) if cat_el else ''

                    # 주최
                    org_el = item.select_one('div.organ')
                    organizer = org_el.get_text(strip=True) if org_el else None

                    # 마감일
                    date_el = item.select_one('div.day')
                    end_date = None
                    if date_el:
                        date_text = date_el.get_text(strip=True)
                        match = re.search(r'D\-(\d+)', date_text)
                        days_offset = None
                        if match:
                            days_offset = int(match.group(1))
                        elif 'd-day' in date_text.lower():
                            days_offset = 0
                            
                        if days_offset is not None:
                            from datetime import timedelta
                            dt = get_kst_now() + timedelta(days=days_offset)
                            end_date = dt.strftime("%Y-%m-%d")

                    if not end_date:
                        continue

                    # 시작일 (오늘 날짜)
                    start_date = get_kst_now().strftime("%Y-%m-%d")

                    # external_contests DB 스키마에 완전히 부합하도록 컬럼 매핑 조정
                    contest = {
                        'title': title,
                        'organizer': organizer,
                        'field': map_field(title, category),
                        'start_date': start_date,
                        'end_date': end_date,
                        'deadline': end_date,
                        'url': detail_url,
                        'is_active': True,
                        'source': 'wevity',
                    }

                    if upsert_contest(contest):
                        count += 1

                except Exception as e:
                    logger.warning(f"항목 파싱 오류: {e}")

            time.sleep(1)

        except Exception as e:
            logger.error(f"위비티 페이지 {page} 오류: {e}")

    logger.info(f"위비티: {count}건 처리 완료")


# ================================================
# 링커리어 크롤러
# ================================================
def crawl_linkareer():
    """링커리어 (linkareer.com) 크롤링 - Next.js SSR __NEXT_DATA__ JSON 파싱 기반"""
    logger.info("=== 링커리어 크롤링 시작 ===")
    import json
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
    }

    count = 0
    for page in range(1, 16):
        try:
            url = f'https://linkareer.com/list/contest?page={page}'
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'lxml')
            script = soup.find('script', id='__NEXT_DATA__')
            if not script:
                logger.warning(f"링커리어 페이지 {page}: __NEXT_DATA__ 태그를 찾을 수 없습니다.")
                break
                
            data = json.loads(script.string)
            apollo = data.get("props", {}).get("pageProps", {}).get("__APOLLO_STATE__", {})
            
            items_found = False
            for key, value in apollo.items():
                if key.startswith("Activity:"):
                    items_found = True
                    try:
                        act_id = value.get("id")
                        title = value.get("title", "").strip()
                        if not title:
                            continue
                            
                        detail_url = f"https://linkareer.com/activity/{act_id}"
                        
                        # 주최기관
                        organizer = value.get("organizationName", "").strip()
                        
                        # 시작일
                        recruit_start = value.get("recruitStartAt")
                        start_date = None
                        if recruit_start:
                            dt_start = datetime.fromtimestamp(recruit_start / 1000.0)
                            start_date = dt_start.strftime("%Y-%m-%d")

                        # 마감일
                        recruit_close = value.get("recruitCloseAt")
                        end_date = None
                        if recruit_close:
                            dt = datetime.fromtimestamp(recruit_close / 1000.0)
                            end_date = dt.strftime("%Y-%m-%d")
                            
                        if not end_date:
                            continue
                            
                        # 마감기한 지난 것 제외
                        today_str = get_kst_now().strftime("%Y-%m-%d")
                        if end_date < today_str:
                            continue
                            
                        # 카테고리
                        category = value.get("category", "")
                        
                        # external_contests DB 스키마에 완전히 부합하도록 컬럼 매핑 조정
                        contest = {
                            'title': title,
                            'organizer': organizer,
                            'field': map_field(title, category),
                            'start_date': start_date,
                            'end_date': end_date,
                            'deadline': end_date,
                            'url': detail_url,
                            'is_active': True,
                            'source': 'linkareer',
                        }
                        
                        if upsert_contest(contest):
                            count += 1
                            
                    except Exception as item_e:
                        logger.warning(f"항목 파싱 오류: {item_e}")
            
            if not items_found:
                logger.info(f"링커리어 페이지 {page}: 더 이상 항목이 없습니다.")
                break
                
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"링커리어 페이지 {page} 오류: {e}")
            
    logger.info(f"링커리어: {count}건 처리 완료")


if __name__ == '__main__':
    logger.info("===== 공모전 크롤러 시작 =====")
    start = get_kst_now()

    crawl_contestkorea()
    crawl_wevity()
    crawl_linkareer()
    delete_expired()

    elapsed = (get_kst_now() - start).seconds
    logger.info(f"===== 크롤링 완료 ({elapsed}초) =====")

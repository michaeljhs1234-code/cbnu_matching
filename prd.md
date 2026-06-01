# 충북match — 통합 PRD v3.0

> **충북대학교 공모전 · 스포츠 통합 매칭 플랫폼**
> Product Requirements Document — 통합 v3.0
> v2.0 PRD + 통합 제안 PRD 를 단일 명세로 종합
>
> **버전** v3.0 | **통합 작성일** 2026-06-01
> **기술 스택** Next.js · Supabase · Vercel · Anthropic Claude API
> **작성 관점** 경영정보학(MIS) 시스템 통합 설계

---

## 목차

0. 통합 개요 및 의사결정 요약
1. 제품 개요
2. 목표 및 성공 지표
3. 정보 아키텍처
4. 인증 시스템
5. 기능 요구사항 상세
6. 데이터베이스 설계
7. API 설계
8. UI/UX 가이드라인
9. 비기능 요구사항
10. 개발 로드맵
11. 리스크 및 제약사항
- 부록 A. 환경 변수
- 부록 B. 공모전 정적 데이터 현황

---

## 0. 통합 개요 및 의사결정 요약

본 문서는 기존 **충북match v2.0 PRD**(스포츠 매치 중심·공모전 기능 확장)와 별도로 작성된 **통합 제안 PRD**(능력 기반 매칭·학교 이메일 인증·크롤링·Claude API 중심)를 단일 제품 명세로 종합한 것이다. 두 문서가 충돌하던 항목은 MIS 관점에서 데이터 정합성, 운영 비용, 사용자 신뢰, 확장성을 기준으로 결정하였다.

### 0.1 핵심 충돌 항목 조율 결정

| 충돌 영역 | v2.0 방식 | 통합 제안 방식 | v3.0 최종 결정 |
|---|---|---|---|
| 인증·학번 | 아이디(가상 이메일)+8자리 학번 형식검증 | @chungbuk.ac.kr 이메일 인증+10자리 학번 | 학교 이메일 인증 채택 + 가입 시 학과·8자리 학번(학부 기준) 입력. 학번은 형식·입학연도 검증만 수행 |
| 스포츠 매칭 | 매치글 작성→신청→수락 (장소 자유입력) | 시설 예약 현황 크롤링→슬롯 선택→파트너 | 결합: 매치글 작성 시 크롤링된 시설 예약 현황을 불러와 장소·시간 선택 연동 |
| 매칭 후 소통 | 1:1 / 그룹 실시간 채팅방 | 이메일 공개 | v2.0 실시간 채팅방 채택 (체류시간·편의성). 이메일 비공개 유지 |
| AI 활용 | 없음 | 공모전 요약·매칭 추천·소개글 보조 | 전면 채택. 공모전 팀원 신청 시 팀장에게 'AI 추천 사유 한 줄' 제공 |
| 자동화 | Vercel Cron (공모전 수집·매치 만료) | GitHub Actions (공모전·시설 크롤링) | 통합 자동화: 외부 공모전 수집 + 시설 예약 크롤링 + 만료 정리 무인 운영 |
| 신뢰·제재 | 매너 별점(1~5) | 신고 누적 3회 자동 블라인드 | 양쪽 모두 채택: 별점 평가 + 누적 신고 3회 자동 비공개 |

### 0.2 변경 이력

| 버전 | 날짜 | 주요 내용 |
|---|---|---|
| v1.0 | 2026-05-26 | 충북match MVP 기능 정의 (스포츠 매치) |
| v2.0 | 2026-05-28 | 공모전 기능, 그룹 채팅, 신청 관리 UI, 자동화 전면 확장 |
| 제안 PRD v1.0 | 2026-05-27 | 능력 기반 매칭·이메일 인증·크롤링·Claude API 제안 |
| v3.0 | 2026-06-01 | 두 PRD를 단일 명세로 통합 (인증·시설연동·AI·자동화·신고 종합) |

---

## 1. 제품 개요

### 1.1 제품 비전

충북대학교 재학생·휴학생이 자신의 능력과 관심사를 등록하면, 종목·수준·역량 기반으로 스포츠 매치 상대 또는 공모전 팀원을 손쉽게 찾고, 신청·수락·실시간 채팅으로 협업하며, 매치 후 매너를 평가할 수 있는 캠퍼스 전용 스포츠·공모전 통합 매칭 플랫폼을 제공한다.

### 1.2 핵심 가치 제안

| 가치 | 설명 |
|---|---|
| 충북대 전용 신뢰 | @chungbuk.ac.kr 이메일 인증 + 학과·학번으로 재학생만 이용하는 신뢰 커뮤니티 |
| 능력 기반 매칭 | 스펙·경력·자격증·관심분야를 공개해 '함께 할 만한 사람'인지 판단 가능 |
| 간편한 매치 탐색 | 종목·수준·분야·지역 필터로 원하는 상대·팀원을 빠르게 발견 |
| 시설 연동 스포츠 매칭 | 크롤링된 교내 체육시설 예약 현황을 매치글 작성 시 연동 |
| 실시간 커뮤니케이션 | 신청·수락·1:1/그룹 채팅이 지연 없이 진행 |
| AI 보조 | Claude API로 공모전 요약·매칭 추천 사유·소개글 작성 보조 |
| 신뢰 기반 생태계 | 매너 별점(1~5) + 누적 신고 3회 자동 블라인드로 악성 유저 차단 |
| 완전 자동화 운영 | 외부 공모전 수집·시설 크롤링·만료 정리까지 무인 운영으로 비용 최소화 |

### 1.3 대상 사용자

- 충북대학교 재학생 및 휴학생 (학부·대학원 무관)
- 학번·학교 이메일 인증을 통과한 사용자에 한해 모든 기능 이용 가능

### 1.4 기술 스택 요약

| 구분 | 기술 | 선택 이유 |
|---|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) | SSR/SSG, Vercel 최적화, 타입 안정성 |
| Styling | Tailwind CSS | 빠른 UI 구현, 일관된 디자인, 모바일 퍼스트 |
| Backend | Next.js API Routes (서버리스) | 프론트와 단일 코드베이스, 운영 단순화 |
| Database | Supabase (PostgreSQL) | 무료 플랜, RLS, Realtime 내장 |
| 인증 | Supabase Auth (이메일 인증) | 세션·JWT 내장, 학교 이메일 도메인 검증 |
| 실시간 | Supabase Realtime | WebSocket 기반 알림·채팅 구독 |
| AI | Anthropic Claude API (claude-sonnet-4) | 공모전 요약, 매칭 추천 사유, 소개글 보조 |
| 크롤링 | Python (BeautifulSoup / Playwright) | 공모전·시설 예약 데이터 수집 |
| 배포 | Vercel (Preview / Production 분리) | Next.js 공식 배포, Edge Network |
| 자동화 | Vercel Cron + GitHub Actions | 수집·만료 정리 무인 스케줄 실행 |

---

## 2. 목표 및 성공 지표

### 2.1 제품 목표

- 충북대 재학생 간 스포츠 매치 성사율 극대화 (신청→수락 평균 1시간 이내)
- 충청권(충북·충남·세종·대전) 공모전 팀원 매칭 활성화
- 능력 기반 프로필로 '신뢰할 수 있는 매칭' 경험 제공
- 매너 평가·신고 시스템으로 안전한 커뮤니티 문화 형성

### 2.2 핵심 성과 지표 (KPI)

| 지표 | 목표치 |
|---|---|
| 회원가입 수 | 서비스 오픈 1개월 내 100명 |
| 매치 게시글 수 | 주간 20건 이상 |
| 매치 성사율 | 신청 대비 50% 이상 수락 |
| 공모전 팀 모집 게시글 | 주간 5건 이상 |
| 매너 평가 참여율 | 매치 확정 건 대비 70% 이상 |
| 실시간 응답 지연 | 알림·채팅 메시지 2초 이내 전달 |
| AI 추천 노출률 | 공모전 신청 카드의 80% 이상에 추천 사유 표시 |

### 2.3 사용자 페르소나

**A — 매치 주최자 (체육학과 3학년, 김민준)**
- 주 2~3회 풋살을 즐기지만 상대팀 구하기가 어려움
- 니즈: 종목·수준에 맞는 상대를 빠르게 구하고, 시설 예약과 연동해 장소·시간을 쉽게 정하고 싶다

**B — 매치 신청자 (컴퓨터공학과 2학년, 이서연)**
- e스포츠 동호회 활동 중, 실력 수준이 맞는 상대와 스크림을 원함
- 니즈: 내 실력에 맞는 상대를 필터로 찾고 바로 신청하고 싶다

**C — 일반 사용자·관전/평가 (경영학과 1학년, 박지호)**
- 상대팀의 매너 점수·신고 이력을 보고 신청 여부를 결정하고 싶음

**D — 공모전 팀 빌더 (디자인학과 3학년, 최유진)**
- 혼자서 모든 분야를 커버할 수 없어 IT·디자인·마케팅 팀원을 찾고 싶음
- 니즈: AI 추천을 참고해 빠르게 팀원을 모집하고 그룹 채팅으로 협업하고 싶다

---

## 3. 정보 아키텍처

로그인 전 공개 영역과 인증 후 영역으로 분리한다. 스포츠·공모전 두 축을 메인 네비게이션으로 두고, 메시지 허브는 1:1 매치 채팅과 공모전 그룹 채팅을 탭으로 통합한다.

```
충북match
├── 공개 영역 (비로그인)
│   ├── /                      ← 랜딩 (서비스 소개)
│   ├── /login                 ← 로그인
│   ├── /signup                ← 회원가입 (학교 이메일 인증)
│   └── /auth/verify           ← 이메일 인증 콜백
│
└── 인증 영역 (로그인 필수)
    ├── /match                 ← 스포츠 매치 목록 (메인)
    ├── /match/write           ← 매치글 작성 (시설 예약 연동)
    ├── /match/[id]            ← 매치 상세
    ├── /sports/facilities     ← 시설 예약 현황 (크롤링)
    ├── /contest               ← 공모전 목록 (지역별 + 즐겨찾기)
    ├── /contest/[id]          ← 공모전 상세 → 팀원 찾기
    ├── /contest/matches       ← 공모전 팀원 모집 목록
    ├── /contest/write         ← 공모전 팀원 모집 작성
    ├── /review                ← 팀 후기 / 매너 평가
    ├── /messages              ← 메시지 허브 (매치 1:1 + 공모전 그룹)
    ├── /messages/[roomId]     ← 1:1 매치 채팅방
    ├── /messages/contest/[roomId] ← 공모전 그룹 채팅방
    ├── /matches               ← 매칭 신청 관리 (보낸/받은)
    ├── /profile               ← 내 정보 (스포츠·공모전 프로필)
    ├── /notifications         ← 알림 센터
    └── /report                ← 신고 (유저 카드 내 진입)
```

---

## 4. 인증 시스템

### 4.1 회원가입

> **유저 스토리:** "충북대 재학생으로서 학교 이메일과 학번으로 가입하여 신뢰할 수 있는 커뮤니티에 참여하고 싶다."

**입력 필드 명세**

| 필드 | 타입 | 제약 조건 | 오류 메시지 |
|---|---|---|---|
| 이메일 | email | @chungbuk.ac.kr 도메인만 허용 (프론트+백엔드 이중 검증) | "충북대학교 이메일(@chungbuk.ac.kr)만 가입 가능합니다." |
| 비밀번호 | password | 최소 8자, 영문+숫자+특수문자 조합 | "비밀번호는 8자 이상, 영문·숫자·특수문자를 포함해야 합니다." |
| 비밀번호 확인 | password | 비밀번호와 일치 | "비밀번호가 일치하지 않습니다." |
| 이름(실명) | text | 한글 2~5자 | "올바른 이름을 입력해 주세요." |
| 닉네임 | text | 2~10자, 중복 불가 | "이미 사용 중인 닉네임입니다." |
| 학번 | text | 8자리 숫자 (학부 기준), 입학연도 검증 | "학번은 8자리 숫자여야 합니다." |
| 소속 학과 | select | 충북대 학과 목록 선택 | "학과를 선택해 주세요." |

**닉네임 중복 처리**

- [중복 확인] 버튼 클릭 또는 입력 필드 blur 시 profiles 테이블 조회
- 이미 존재하는 닉네임이면 입력 필드 하단에 빨간색 안내 '이미 사용 중인 닉네임입니다.' 즉시 표시 + [가입하기] 비활성화
- 사용 가능한 닉네임이면 '사용 가능한 닉네임입니다.'를 초록색으로 표시

**학번 유효성 검증 규칙**

```
형식: YYYY0000 (앞 4자리: 입학연도, 뒤 4자리: 일련번호)
 - 입학연도: 1990 ~ 현재연도 범위
 - 숫자 외 입력 불가 (pattern="[0-9]{8}", maxLength=8)
 - 형식·범위 검증만 수행 (학사 시스템 실재 여부 검증은 불가)
```

**인증 플로우**

1. 사용자 폼 입력 → 클라이언트 실시간 유효성 검사
2. 이메일 도메인 검증 실패 시 즉시 에러 표시
3. 닉네임 중복 확인 버튼 → profiles 테이블 조회
4. [가입하기] → Supabase Auth로 계정 생성 + 인증 메일 발송
5. 이메일 내 링크 클릭 → 인증 완료 → profiles 레코드 INSERT (학과 포함)
6. 인증 완료 후 로그인 페이지 또는 메인으로 리다이렉트

### 4.2 로그인

- 이메일 + 비밀번호 → Supabase Auth signInWithPassword()
- "로그인 상태 유지" 체크박스: 세션 만료 7일 vs 브라우저 종료 시
- 실패 시: "이메일 또는 비밀번호가 올바르지 않습니다."
- 이메일 미인증 로그인 시도: "이메일 인증을 완료해 주세요."
- 비밀번호 찾기: 등록된 충북대 이메일로 재설정 링크 발송

**세션 관리**

- Supabase 클라이언트가 세션 자동 저장, 새로고침 시 자동 복구
- JWT 만료 시 자동 갱신, 로그아웃 시 세션 삭제 + /login 리다이렉트

### 4.3 회원탈퇴

- 설정 > 계정 > 회원탈퇴
- 탈퇴 시 작성한 매칭 프로필 비공개 처리, 개인식별 정보 30일 후 삭제 (Supabase Edge Function cron)
- 탈퇴 후 동일 이메일로 재가입 가능 (단, 영구 퇴출자는 재가입 불가)

---

## 5. 기능 요구사항 상세

### 5.1 스포츠 매치 목록 (/match)

> **유저 스토리:** "원하는 종목과 수준의 매치를 빠르게 찾아 신청하고 싶다."

**화면 구성**

```
[전체] [⚽축구] [🥅풋살] [🏀농구] [🎾테니스] [🎮e스포츠]   ← 종목 필터
[전체] [초급] [중급] [고수]                              ← 수준 필터
──────────────────────────────────────────────
매치 카드 목록 (최신순)
 ┌──────────────────────────────────┐
 │ ⚽ 축구 | 11vs11 | 중급             │
 │ 팀명: FC충북 | 모집 중 🟢            │
 │ 📍 풋살장 A · 6/3(화) 19:00          │  ← 시설 예약 연동
 │ "같이 즐겁게 뛸 팀 구해요"  [매치 신청] │
 └──────────────────────────────────┘
```

**매치 신청 플로우**

1. [매치 신청] 클릭
2. 본인 게시글인가? → "본인 게시글에는 신청할 수 없습니다."
3. 이미 신청했는가? → "이미 신청한 매치입니다."
4. 정상 신청 → match_applications INSERT(status: pending)
5. notifications INSERT (작성자 수신) → Realtime Push
6. 작성자가 [수락]/[거절] 선택
   - 수락: status→accepted, 매치 '확정', 1:1 채팅방 자동 생성
   - 거절: status→rejected, 신청자 알림, 매치글 '모집 중' 유지

**매치 자동 만료**

- match_datetime이 현재보다 과거인 매치는 목록에서 즉시 제외
- Vercel Cron (매일 00:00 KST): match_datetime < NOW() 레코드 자동 삭제 (/api/cron/cleanup-matches)

**신청 취소 후 재신청 (즉시 복원)**

- '내 정보 > 지원한 신청'에서 대기중 신청 취소 → 레코드 DELETE
- Realtime DELETE 이벤트 감지 → appliedIds 갱신 → '신청 완료'가 '매치 신청'으로 즉시 복원

### 5.2 매치글 작성 (/match/write) — 시설 예약 연동

> **유저 스토리:** "우리 팀 정보와 조건을 작성하되, 크롤링된 시설 예약 현황에서 장소·시간을 바로 선택하고 싶다."

| 필드 | UI | 필수 | 제약 |
|---|---|---|---|
| 팀명 | text | ✅ | 2~20자 |
| 종목 | card select | ✅ | 5가지 중 1개 |
| 매치 인원 | 자유 입력 + 추천 프리셋 | ✅ | 작성자가 자율 설정 (종목별 기본값 제시) |
| 장소·시간 | 시설 예약 연동 선택 | ✅ | 크롤링된 available 슬롯에서 선택 (또는 직접 입력) |
| 소개글 | textarea | ✅ | 10~500자 |
| 원하는 수준 | button group | ✅ | 초급 / 중급 / 고수 |

**인원 ↔ 종목 연관 규칙**

**설계 원칙:** 매치 인원은 모집글 작성자가 자율적으로 직접 입력·설정한다. 실제 경기에서는 교체 선수 등 변동이 잦으므로 시스템이 인원을 고정 제한하지 않는다. 다만 작성 편의를 위해 종목별 보편적인 경기 인원을 기본값(추천 프리셋)으로 제시하고, 작성자가 필요 시 자유롭게 수정한다.

| 종목 | 기본값(추천 프리셋) | 인원 설정 방식 |
|---|---|---|
| ⚽ 축구 | 11vs11 | 자유 입력 (프리셋 제시, 수정 가능) |
| 🥅 풋살 | 6vs6 | 자유 입력 (프리셋 제시, 수정 가능) |
| 🏀 농구 | 3vs3, 5vs5 | 자유 입력 (프리셋 제시, 수정 가능) |
| 🎮 e스포츠 | 듀오(2인) / 스쿼드(4인) | 자유 입력 (프리셋 제시, 수정 가능) |

**동작:** 종목 선택 시 해당 종목의 보편 인원이 기본값으로 채워지되, 인원 필드는 비활성화하지 않는다. 작성자는 교체 선수 포함 등 실제 상황에 맞게 인원을 자유롭게 변경할 수 있다. 장소·시간 선택 시 해당 시설의 available 슬롯만 노출하고, 매치 확정 시 해당 슬롯을 참고 정보로 표시한다(예약 자체는 학교 시스템에서 별도 수행).

### 5.3 시설 예약 현황 (/sports/facilities)

- 종목 탭: 풋살 / 농구 / 테니스 / 소운동장 / 종합운동장
- 날짜 선택 캘린더 + 시간대별 슬롯 타임라인 (available / reserved / closed 시각 구분)
- 데이터는 sports_reservations 테이블(크롤링)에서 조회, 1시간 주기 갱신
- 크롤링 실패 시 마지막 수집 시각 표시 + "현재 정보를 불러올 수 없습니다" 안내

### 5.4 팀 후기 · 매너 평가 (/review)

> **유저 스토리:** "매치가 끝난 후 상대팀의 매너를 별점으로 평가하고, 내가 받은 평가를 확인하고 싶다."

**평가 버튼 활성화 조건**

1. match_applications.status = accepted (매치 확정)
2. 해당 매치의 참여자 (작성자 또는 신청자)
3. 해당 매치에 대해 아직 평가하지 않음 (reviews에 reviewer_id+match_id 조합 없음)

**평가 저장 로직**

- 별점(1~5) + [제출] → reviews INSERT (reviewer_id, reviewee_id, match_id, rating)
- UNIQUE(match_id, reviewer_id) 제약으로 중복 평가 차단
- 상대방 프로필 평균 점수 실시간 업데이트

### 5.5 메시지 시스템 (/messages)

**5.5.1 1:1 매치 채팅**

- 생성 조건: match_applications.status=accepted 시 message_rooms row 자동 INSERT
- 양 참여자가 /messages에서 접근, 경기 장소·시간 조율
- 나가기: [나가기] → 확인 → message_rooms + messages CASCADE 삭제 (양쪽 이력 삭제)

**5.5.2 공모전 그룹 채팅**

- 생성 조건: contest_applications.status=accepted 시 contest_chat_rooms 자동 INSERT(없을 때) + 수락 신청자 자동 멤버 추가, 팀장은 게시글 작성 시 자동 포함
- 탭 구성: [매치 채팅] (1:1 목록) / [공모전 팀 채팅] (그룹 목록)
- 나가기(그룹): contest_chat_members에서 해당 유저만 제거, 채팅방·메시지는 다른 팀원에게 유지

**팀원 초대 (3중 보안 검증)**

```
그룹 채팅방 헤더 [팀원 초대] (팀장만 표시)
  GET /api/contest-rooms/[id]/invite
    → 수락(accepted)되었으나 미참여인 멤버 목록 반환
  POST /api/contest-rooms/[id]/invite  (보안 검증)
    1) 요청자 = 팀장(contest_matches.author_id) 여부
    2) 초대 대상 = contest_applications.status='accepted' 여부
    3) 이미 멤버면 409 Conflict
    → contest_chat_members INSERT
```

**실시간 채팅 구현**

- Supabase Realtime SUBSCRIBE 채널 contest-chat:[roomId], 이벤트 INSERT
- 신규 메시지 수신 시 자동 스크롤, 발신자 닉네임·아바타 표시
- Realtime 불안정 대비 3초 폴링 폴백

### 5.6 내 정보 (/profile)

> **유저 스토리:** "내 프로필과 스포츠·공모전 능력 정보를 관리하고, 받은 신청과 지원한 신청을 한눈에 보고 싶다."

**탭 구성**

| 탭 | 내용 |
|---|---|
| 내 매치글 | 작성한 매치글 목록, 수정/삭제 |
| 받은 신청 | 내 매치에 들어온 pending 신청, 수락/거절, 10초 폴링 + Realtime 갱신 |
| 지원한 신청 | 내가 신청한 매치(rejected 제외), 대기중 신청 취소 |
| 내 경기 | 확정된 매치 목록, 매치 취소 가능 |
| 내 공모전 | 참여 중인 공모전 목록 |
| 스포츠 프로필 | 성별·나이·관심종목·경력·선출 여부·소개글·공개 토글 |
| 공모전 프로필 | 학과·성별·나이·참여횟수·자격증·관심분야·소개글·공개 토글 |
| 캘린더 | 경기·공모전 일정 달력 |
| 매너 평가 | 받은 별점 이력 |

**받은 신청 탭 상세**

- 각 카드: 신청자 닉네임 + 실력 + 신청 매치명 + (AI 추천 사유 한 줄, 가능 시)
- [수락] PATCH /api/applications/[id]/accept → 매치 확정 + 채팅방 생성
- [거절] PATCH /api/applications/[id]/reject, 10초 폴링으로 신규 신청 자동 반영

**지원한 신청 탭 상세**

- 상태: 검토 중(pending) / 수락됨(accepted)
- 대기중 신청에만 [취소] → DELETE /api/applications/[id]/withdraw → 매치 '모집중' 복원
- 수락됨 신청: 채팅방 안내 메시지 표시

**프로필 카드**

```
👤 프로필
 닉네임: [수정 가능]    이메일: ****@chungbuk.ac.kr (비공개)
 학번:   202*****  (마스킹)   소속학과: 컴퓨터공학과
 실력:   [중급] 즉시 저장      공모전 출전 횟수: [3회]
 매너 평점: ★ 4.6 (12건)      신고 누적: 0건
```

### 5.7 공모전 (/contest)

> **유저 스토리:** "충청권 공모전 정보를 한눈에 보고 즐겨찾기하며, 관심 공모전의 팀원을 모집하거나 합류하고 싶다."

**5.7.1 공모전 목록**

- 상단 즐겨찾기 섹션: 카드 우상단 ★ 토글, localStorage에 공모전 ID 배열 저장 (DB 부하 無)
- 지역: 충청북도(🏔️) / 충청남도(🌊) / 세종특별자치시(🏛️) / 대전광역시(⚗️)
- 카테고리 필터: 전체 / 글·문학 / 디자인·미술 / 사진·영상 / IT·과학 / 창업·마케팅 / 환경·사회 / 공학·기술 / 예술·공연
- 데이터 소스 2종: 정적 데이터(data/contests.ts, 17개) + 외부 수집(external_contests, 크롤링)
- AI 요약: 공모전 상세 진입 시 Claude API로 2~3줄 요약 제공 (실패 시 요약만 비활성, 원문 표시)

**공모전 자동 만료**

- 정적: isExpiredContest(deadline) = deadline+1일 < now() 이면 만료 필터
- 외부 수집: GET /api/external-contests는 deadline > yesterday 만 반환, Cron이 만료 레코드 DELETE

**5.7.2 공모전 팀원 모집 (/contest/matches)**

**게시글 작성**

```
필드: 공모전 이름(≤100자) / 분야(카테고리) / 지역(4개)
      마감일(date, 오늘 이후) / 모집 인원(1~5, 본인 제외) / 소개글(≥10자)
게시 후 자동 처리:
  → contest_matches INSERT (status:'모집중', current_count:0)
  → contest_chat_rooms INSERT (그룹 채팅방 자동 생성)
  → contest_chat_members INSERT (작성자 자동 추가)
```

**실시간 남은 자리 + 자동 마감**

- 각 카드 남은 자리 배지 실시간: 초록(3+)/주황(2 이하)/빨강(1 이하)
- Realtime로 contest_matches UPDATE 개별 구독, 수락 시 전 사용자 화면에서 즉시 감소
- 정원 충족(current_count ≥ team_size): status='마감' → 목록 즉시 제거, 나머지 pending 자동 거절+알림

**신청 수락 플로우 (+ AI 추천)**

1. 신청 시 팀장 알림 카드에 Claude API 추천 사유 한 줄 표시 (예: "디자인 자격증 보유·관심분야 일치로 추천")
2. [수락] PATCH /api/contest-applications/[id]/accept
3. status=accepted → current_count += 1 → 정원 충족 시 status='마감'
4. contest_chat_members에 신청자 추가(채팅방 자동 입장) + 수락 알림
5. 팀 가득 참 → 나머지 신청자 자동 거절 + 알림

### 5.8 알림 시스템

| ID | 이벤트 | 수신자 | 메시지 | 액션 |
|---|---|---|---|---|
| N1 | 매치 신청 수신 | 매치 작성자 | [닉네임] 님이 매치를 신청했습니다. 실력: [수준] | [수락][거절] |
| N2 | 매치 수락 | 신청자 | 매치가 수락되었습니다! [팀명]과의 매치 확정 | [채팅] |
| N3 | 매치 거절 | 신청자 | 거절되었습니다. | - |
| N4 | 새 메시지 | 채팅 상대 | [닉네임]: [미리보기] | [채팅 열기] |
| N5 | 공모전 신청 수신 | 모집 작성자 | [닉네임] 님이 팀원 신청했습니다. (+AI 추천) | [수락][거절] |
| N6 | 공모전 수락 | 신청자 | [공모전명] 팀원 신청이 수락되었습니다! | [채팅] |
| N7 | 공모전 거절 | 신청자 | [공모전명] 팀원 신청이 거절되었습니다. | - |
| N8 | 매치 취소 | 상대방 | [닉네임] 님이 매치를 취소했습니다. | - |
| N9 | 신고 누적 경고 | 관리자/대상 | 누적 신고 3회 도달, 프로필 자동 비공개 | - |

**처리 방식**

- Realtime 구독 채널 notifications:user_id=eq.[현재 유저], 이벤트 INSERT
- 헤더 벨 배지 +1, 우측 하단 Toast(3초 자동 소멸), /notifications 누적, 읽음 시 배지 감소

### 5.9 신고 시스템 (/report)

- 유저 카드 [신고] → 사유 선택(불쾌한 언행 / 허위 정보 / 스팸 / 기타) + 상세 입력
- reports INSERT → 관리자 대시보드에서 검토(pending/resolved/dismissed)
- 누적 신고 3회 이상: 계정 자동 비공개(is_visible=FALSE) + 관리자 알림(N9)

**허위 정보 제재 프로세스 (자기신고 기반 검증 보완)**

1. 매칭 성사 후 상대 프로필 허위 인지 → '허위 정보 신고' 제출
2. 관리자 검토 → 사실 확인
3. 1차: 경고 + 프로필 강제 수정 요청
4. 2차: 30일 계정 정지
5. 3차: 영구 퇴출 (동일 이메일 재가입 불가)

### 5.10 Claude API 활용

| 기능 | 활용 방식 | 장애 시 동작 |
|---|---|---|
| 공모전 요약 | 크롤링한 상세 내용을 2~3줄 요약 | 요약만 숨김, 원문 표시 |
| 매칭 추천 사유 | 두 유저 프로필 비교 → '잘 맞는 이유' 한 줄 (신청 카드·알림) | 추천 사유 미표시, 신청 정상 처리 |
| 소개글 작성 보조 | 프로필 자기소개 초안 작성 (선택 기능) | 수동 입력으로 대체 |

- 모든 Claude 호출은 서버 사이드(API Route)에서만 수행, ANTHROPIC_API_KEY 클라이언트 노출 금지

### 5.11 자동화 시스템 (Cron / Actions)

| 경로/잡 | 스케줄 | 동작 |
|---|---|---|
| /api/cron/sync-contests | 매일 00:00 KST | 올콘·링커리어·위비티 공모전 수집 + 만료 레코드 삭제 |
| /api/cron/cleanup-matches | 매일 00:00 KST | match_datetime 지난 매치 자동 삭제 |
| GitHub Actions: contest_crawler | 매일 02:00 KST | 공모전 크롤링(BeautifulSoup), 신규 INSERT/마감 UPDATE |
| GitHub Actions: facility_crawler | 매 1시간 | 시설 예약 현황 크롤링, 상태 변경 시 UPDATE |
| Edge Function: purge_users | 매일 | 탈퇴 30일 경과 개인식별 정보 삭제 |

**vercel.json 설정**

```json
{
  "crons": [
    { "path": "/api/cron/sync-contests",  "schedule": "0 15 * * *" },
    { "path": "/api/cron/cleanup-matches", "schedule": "0 15 * * *" }
  ]
}
```

**보안:** 모든 Cron 엔드포인트는 CRON_SECRET 환경변수로 호출 인증, 크롤러는 SUPABASE_SERVICE_KEY 사용(service_role).

---

## 6. 데이터베이스 설계

두 PRD의 스키마를 통합한다. v2.0의 profiles를 기준 회원 테이블로 삼되, 능력 기반 매칭을 위해 별도 contest_profiles / sports_profiles 를 분리한다. 공모전·채팅·신고·시설예약·외부공모전 테이블을 포함한다.

### 6.1 핵심 테이블 요약

| 테이블 | 역할 | 주요 컬럼 |
|---|---|---|
| profiles | 기준 회원 정보 | id(FK auth.users), email, nickname, full_name, student_id, department, skill_level, contest_count, role |
| contest_profiles | 공모전 능력 프로필 | user_id, department, gender, age, contest_count, certificates[], fields[], intro, is_visible |
| sports_profiles | 스포츠 능력 프로필 | user_id, gender, age, sports[], career_years, is_pro, intro, is_visible |
| matches | 스포츠 매치글 | author_id, team_name, sport, match_size, location, match_datetime, required_level, status, reservation_id(FK) |
| match_applications | 매치 신청 | match_id, applicant_id, status, UNIQUE(match_id, applicant_id) |
| message_rooms / messages | 1:1 채팅 | application_id, participant_1/2 / room_id, sender_id, content, is_read |
| reviews | 매너 평가 | match_id, reviewer_id, reviewee_id, rating(1~5), UNIQUE(match_id, reviewer_id) |
| contest_matches | 공모전 팀원 모집 | author_id, contest_name, contest_category, region, deadline, team_size, current_count, status |
| contest_applications | 공모전 신청 | contest_match_id, applicant_id, status, UNIQUE(contest_match_id, applicant_id) |
| contest_chat_rooms / members / messages | 공모전 그룹 채팅 | contest_match_id / room_id, user_id / room_id, sender_id, content |
| contests / external_contests | 공모전 정보(크롤링) | title, organizer, field, start_date, end_date, prize, url(UNIQUE), source, is_active |
| sports_reservations | 시설 예약 현황(크롤링) | facility, reservation_date, start_time, end_time, status, UNIQUE(facility,date,start_time) |
| notifications | 알림 | user_id, type, message, related_id, is_read |
| reports | 신고 | reporter_id, reported_id, reason, detail, status |

### 6.2 대표 스키마 (SQL 발췌)

**profiles (기준 회원)**

```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id),
  email        TEXT UNIQUE NOT NULL,        -- @chungbuk.ac.kr
  nickname     TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  student_id   CHAR(8) NOT NULL,            -- 학부 8자리
  department   TEXT,
  skill_level  TEXT CHECK (skill_level IN ('초급','중급','고수')),
  contest_count INTEGER DEFAULT 0,
  role         TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**matches (시설 연동 컬럼 포함)**

```sql
CREATE TABLE matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID REFERENCES profiles(id),
  team_name     TEXT NOT NULL,
  sport         TEXT CHECK (sport IN ('축구','풋살','농구','테니스','e스포츠')),
  match_size    TEXT,
  location      TEXT,
  match_datetime TIMESTAMPTZ,
  reservation_id UUID REFERENCES sports_reservations(id),  -- 시설 연동
  required_level TEXT CHECK (required_level IN ('초급','중급','고수')),
  status        TEXT DEFAULT '모집중' CHECK (status IN ('모집중','매치확정','취소됨')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 Row Level Security (RLS) 정책

| 테이블 | 정책 |
|---|---|
| profiles | 본인만 UPDATE, 인증 유저 전체 SELECT |
| contest_profiles / sports_profiles | 본인만 INSERT/UPDATE/DELETE, is_visible=TRUE는 인증 유저 SELECT |
| matches | 로그인 유저 INSERT, 본인만 UPDATE/DELETE |
| match_applications | 로그인 유저 INSERT, 관련 당사자만 UPDATE |
| reviews | 매치 참여자만 INSERT, 수정/삭제 불가 |
| messages / contest_chat_messages | 채팅방 참여자/멤버만 SELECT/INSERT |
| contest_chat_members | 채팅방 멤버만 SELECT, 팀장만 INSERT |
| contest_matches | 로그인 유저 INSERT, 본인만 UPDATE/DELETE |
| notifications | 본인 알림만 SELECT/UPDATE |
| reports | reporter만 INSERT, SELECT/UPDATE는 admin만 |
| contests / external_contests / sports_reservations | 인증 유저 SELECT, INSERT/UPDATE/DELETE는 service_role(크롤러)만 |

---

## 7. API 설계

Next.js API Routes(/app/api) 기반 서버리스 함수. 모든 라우트는 Supabase JWT 검증 미들웨어 적용.

### 7.1 인증 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /api/auth/signup | 회원가입 (이메일 인증) |
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/auth/check-nickname | 닉네임 중복 확인 |
| POST | /api/auth/reset-password | 비밀번호 재설정 메일 발송 |

### 7.2 매치 / 신청 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET / POST | /api/matches | 매치 목록(만료 필터) / 작성 |
| GET / PUT / DELETE | /api/matches/[id] | 상세 / 수정 / 삭제 |
| PATCH | /api/matches/[id]/cancel | 확정 매치 취소 |
| POST | /api/matches/[id]/apply | 매치 신청 |
| PATCH | /api/applications/[id]/accept | 수락 (채팅방 생성) |
| PATCH | /api/applications/[id]/reject | 거절 |
| DELETE | /api/applications/[id]/withdraw | 대기중 신청 취소 |

### 7.3 공모전 / 그룹 채팅 API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET / POST | /api/contest-matches | 모집 목록(모집중만) / 작성 |
| POST | /api/contest-matches/[id]/apply | 팀원 신청 |
| PATCH | /api/contest-applications/[id]/accept | 수락 + 채팅 입장 + 자동 마감 |
| PATCH | /api/contest-applications/[id]/reject | 거절 |
| GET | /api/contest-rooms | 참여 그룹 채팅방 목록 |
| GET / POST | /api/contest-rooms/[id]/messages | 메시지 조회 / 전송 |
| DELETE | /api/contest-rooms/[id]/leave | 나가기 (멤버만 제거) |
| GET / POST | /api/contest-rooms/[id]/invite | 초대 가능 목록 / 초대(3중 검증) |
| GET | /api/external-contests | 외부 공모전(만료 필터) |

### 7.4 후기 / 메시지 / 알림 / 신고 / AI API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET / POST | /api/reviews | 받은 후기 / 작성 |
| GET / POST / DELETE | /api/messages/[roomId] | 1:1 메시지 조회/전송/나가기 |
| GET | /api/notifications | 알림 목록 |
| PATCH | /api/notifications/[id]/read | 읽음 처리 |
| PATCH | /api/notifications/read-all | 전체 읽음 |
| POST | /api/reports | 신고 접수 |
| POST | /api/ai/summarize | 공모전 요약 (Claude) |
| POST | /api/ai/recommend | 매칭 추천 사유 (Claude) |

### 7.5 자동화 Cron API

| 메서드 | 경로 | 스케줄 | 설명 |
|---|---|---|---|
| GET | /api/cron/sync-contests | 0 15 * * * | 외부 공모전 수집 + 만료 삭제 |
| GET | /api/cron/cleanup-matches | 0 15 * * * | 경기 지난 매치 삭제 |

---

## 8. UI/UX 가이드라인

### 8.1 컬러 팔레트

| 용도 | 색상 | HEX |
|---|---|---|
| Primary (메인) | 충북대 청색 | #1E3A5F |
| Accent (강조) | 주황 | #FF6B35 |
| Success (수락) | 초록 | #22C55E |
| Danger (거절) | 빨강 | #EF4444 |
| Background | 연회색 | #F8FAFC |
| Card | 흰색 | #FFFFFF |
| Contest (공모전) | 노랑 | #EAB308 |

### 8.2 종목 / 수준 / 지역 배지

| 분류 | 항목 | 색상 |
|---|---|---|
| 종목 | ⚽축구 | #16A34A |
| 종목 | 🥅풋살 | #2563EB |
| 종목 | 🏀농구 | #EA580C |
| 종목 | 🎾테니스 | #0F766E |
| 종목 | 🎮e스포츠 | #7C3AED |
| 수준 | 초급 / 중급 / 고수 | #86EFAC / #FCD34D / #F87171 |
| 지역 | 충북🏔️ / 충남🌊 / 세종🏛️ / 대전⚗️ | #1D4ED8 / #0F766E / #7C3AED / #B45309 |
| 남은자리 | 3+ / 2이하 / 1이하 | 초록 / 주황 / 빨강 |

### 8.3 핵심 컴포넌트

- MatchCard — 매치 카드(종목 배지, 팀명, 수준, 시설·시간, 신청 버튼)
- ContestMatchCard — 공모전 모집 카드(실시간 남은 자리, 신청 현황)
- PendingApplications — 신청 현황(닉네임·실력·AI 추천·수락/거절)
- FacilityTimeline — 시설 예약 타임라인(available/reserved/closed)
- UserProfileCard — 능력 기반 프로필 카드(매칭 신청·신고)
- NotificationBell / Dropdown / Toast — 알림 UI
- StarRating / ChatBubble / FilterBar / InviteModal / MatchCalendar

---

## 9. 비기능 요구사항

### 9.1 성능

| 항목 | 목표 |
|---|---|
| 페이지 첫 로드 (LCP) | 2.5초 이내 |
| 실시간 알림 지연 | 2초 이내 |
| 채팅 메시지 전달 | 1초 이내 |
| API 응답 시간 | 500ms 이내 |
| 실시간 구독 폴링 폴백 | 3~10초 간격 |

### 9.2 보안

- Supabase RLS로 인증 유저만 데이터 접근, JWT 자동 갱신
- 학번 마스킹(202*****), 이메일은 매칭 후에도 비공개(채팅으로 소통)
- 비밀번호 bcrypt 해시(Supabase Auth)
- 공모전 팀원 초대 3중 검증(팀장+수락상태+미참여)
- Cron CRON_SECRET, 크롤러·AI 키는 서버 사이드 전용

### 9.3 호환성 / 접근성

| 항목 | 범위 |
|---|---|
| 브라우저 | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| 기기 | PC, 태블릿, 모바일 (반응형, 모바일 퍼스트) |
| 최소 해상도 | 375px |

### 9.4 데이터 보존

- 매칭 기록 1년 보존, 공모전 데이터 마감 후 6개월 보존
- 탈퇴 후 개인식별 정보 30일 뒤 자동 삭제

---

## 10. 개발 로드맵

| Phase | 내용 | 기간 |
|---|---|---|
| 1 | 프로젝트 세팅 + DB 스키마/RLS + 이메일 인증(학과·학번) | 2주 |
| 2 | 스포츠 매치글·목록·필터 + 시설 예약 크롤러 연동 | 2주 |
| 3 | 매치 신청·수락·거절 + 1:1 채팅 + 알림(Realtime) | 2주 |
| 4 | 매너 평가 + 내 정보(받은/지원 신청 탭) + 매치 취소 | 1.5주 |
| 5 | 공모전 목록·즐겨찾기 + 외부 수집 크롤러 + 4개 지역 | 1.5주 |
| 6 | 공모전 팀원 모집·신청·수락 + 그룹 채팅·초대 + 자동 마감 | 2주 |
| 7 | Claude API(요약·추천·소개글) 연동 | 1주 |
| 8 | 신고 시스템 + 관리자 대시보드 + 누적 블라인드 | 1주 |
| 9 | 자동화(Cron·Actions) 안정화 + QA·최적화 + Vercel 배포 | 1주 |

---

## 11. 리스크 및 제약사항

| 리스크 | 영향도 | 대응 방안 |
|---|---|---|
| 학번·신원 검증 불완전 | 중 | 형식+입학연도 검증 + 학교 이메일 인증 병행으로 최소 필터링 |
| 시설 예약 사이트 구조 변경 | 높 | 크롤러 정기 점검, 실패 시 마지막 데이터 유지·안내, 로그 기록 |
| 외부 공모전 사이트 구조 변경 | 중 | 파싱 실패 시 빈 배열 graceful 처리, 정적 데이터 폴백 |
| Realtime 연결 불안정 | 중 | 재연결 로직 + 폴링 폴백(3~10초) |
| 동시 다중 신청 충돌 | 중 | DB 트랜잭션 + UNIQUE 제약 |
| Claude API 장애 | 낮 | AI 기능만 비활성, 핵심 서비스 정상 운영 |
| 팀원 초대 권한 우회 | 높 | 3중 검증(팀장·수락·미참여) |
| Supabase 무료 플랜 한계 | 낮 | 초기 소규모 충분, 초과 시 Pro 전환 |
| 허위 자기신고(선출 여부 등) | 중 | 신고 기반 검증 + 단계적 제재(경고→정지→퇴출) |
| localStorage 즐겨찾기 소실 | 낮 | 서버 저장 불필요, 캐시 삭제 시 리셋 허용 |

---

## 부록 A. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 서버/크롤러 전용, 클라이언트 노출 금지

# Anthropic
ANTHROPIC_API_KEY=             # 서버 사이드 전용

# Vercel Cron / 앱
CRON_SECRET=
NEXT_PUBLIC_APP_URL=           # 이메일 인증 리다이렉트용
```

## 부록 B. 공모전 정적 데이터 현황

| 지역 | 게시물 수 | 주요 공모전 |
|---|---|---|
| 충청북도 | 3개 | 미디어아트 판타지아, 유니버시아드 디자인, 충청U대회 숏폼 |
| 충청남도 | 4개 | 충남관광 사진영상, 충남 방문의 해 그림 등 |
| 세종특별자치시 | 3개 | 지자체 캐릭터 페스티벌 등 |
| 대전광역시 | 7개 | 공공디자인, 대전부르스 창작가요제, 대청호오백리길 사진 등 |
| 합계 | 17개 | - |

---

*충북match 통합 PRD v3.0 | 통합 작성 2026-06-01*

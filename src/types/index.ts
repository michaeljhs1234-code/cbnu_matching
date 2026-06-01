// ============================================================
// 충북match — TypeScript 타입 정의
// ============================================================

// ─── 프로필 ─────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  nickname: string;
  full_name: string | null;
  student_id: string;
  department: string | null;
  skill_level: '초급' | '중급' | '고수' | null;
  contest_count: number;
  role: 'user' | 'admin';
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SportsProfile {
  id: string;
  user_id: string;
  gender: string | null;
  age: number | null;
  sports: string[];
  career_years: number | null;
  is_pro: boolean;
  intro: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContestProfile {
  id: string;
  user_id: string;
  department: string | null;
  gender: string | null;
  age: number | null;
  contest_count: number;
  certificates: string[];
  fields: string[];
  intro: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// ─── 스포츠 매치 ───────────────────────────────────────────
export type Sport = '축구' | '풋살' | '농구' | '테니스' | 'e스포츠';
export type SkillLevel = '초급' | '중급' | '고수';
export type MatchStatus = '모집중' | '매치확정' | '취소됨';

export interface Match {
  id: string;
  author_id: string;
  team_name: string;
  sport: Sport;
  match_size: string;
  location: string | null;
  match_datetime: string;
  reservation_id: string | null;
  required_level: SkillLevel;
  description: string;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  // joined
  author?: Profile;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface MatchApplication {
  id: string;
  match_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  created_at: string;
  // joined
  applicant?: Profile;
  match?: Match;
}

// ─── 메시지 (1:1) ──────────────────────────────────────────
export interface MessageRoom {
  id: string;
  application_id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  // joined
  other_user?: Profile;
  last_message?: Message;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  // joined
  sender?: Profile;
}

// ─── 매너 평가 ─────────────────────────────────────────────
export interface Review {
  id: string;
  match_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1~5
  comment: string | null;
  created_at: string;
  // joined
  reviewer?: Profile;
  match?: Match;
}

// ─── 공모전 ────────────────────────────────────────────────
export type ContestRegion = '충청북도' | '충청남도' | '세종특별자치시' | '대전광역시';
export type ContestCategory =
  | '글·문학'
  | '디자인·미술'
  | '사진·영상'
  | 'IT·과학'
  | '창업·마케팅'
  | '환경·사회'
  | '공학·기술'
  | '예술·공연';
export type ContestMatchStatus = '모집중' | '마감';

export interface Contest {
  id: string;
  title: string;
  organizer: string;
  field: ContestCategory;
  region: ContestRegion;
  start_date: string;
  end_date: string;
  deadline: string;
  prize: string | null;
  description: string;
  url: string;
  image_url: string | null;
  source: 'static' | 'crawled';
  is_active: boolean;
}

export interface ContestMatch {
  id: string;
  author_id: string;
  contest_name: string;
  contest_category: ContestCategory;
  region: ContestRegion;
  deadline: string;
  team_size: number;
  current_count: number;
  description: string;
  status: ContestMatchStatus;
  created_at: string;
  updated_at: string;
  // joined
  author?: Profile;
}

export interface ContestApplication {
  id: string;
  contest_match_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  ai_recommendation: string | null;
  created_at: string;
  // joined
  applicant?: Profile;
  contest_match?: ContestMatch;
}

// ─── 공모전 그룹 채팅 ──────────────────────────────────────
export interface ContestChatRoom {
  id: string;
  contest_match_id: string;
  created_at: string;
  // joined
  contest_match?: ContestMatch;
  members?: ContestChatMember[];
  last_message?: ContestChatMessage;
}

export interface ContestChatMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  // joined
  user?: Profile;
}

export interface ContestChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // joined
  sender?: Profile;
}

// ─── 알림 ──────────────────────────────────────────────────
export type NotificationType =
  | 'match_application'      // N1
  | 'match_accepted'         // N2
  | 'match_rejected'         // N3
  | 'new_message'            // N4
  | 'contest_application'    // N5
  | 'contest_accepted'       // N6
  | 'contest_rejected'       // N7
  | 'match_cancelled'        // N8
  | 'report_warning';        // N9

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── 신고 ──────────────────────────────────────────────────
export type ReportReason = '불쾌한 언행' | '허위 정보' | '스팸' | '기타';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  created_at: string;
}

// ─── 시설 예약 ─────────────────────────────────────────────
export type ReservationStatus = 'available' | 'reserved' | 'closed';

export interface SportsReservation {
  id: string;
  facility: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  crawled_at: string;
}

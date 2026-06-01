-- ============================================================
-- 충북match — Supabase DB 스키마 (통합 PRD v3.0)
-- ============================================================

-- ─── 1. profiles (기준 회원) ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE NOT NULL,
  nickname     TEXT UNIQUE NOT NULL,
  full_name    TEXT,
  student_id   CHAR(10) NOT NULL,
  department   TEXT,
  skill_level  TEXT CHECK (skill_level IN ('초급','중급','고수')),
  contest_count INTEGER DEFAULT 0,
  role         TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  avatar_url   TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. sports_profiles (스포츠 능력 프로필) ────────────────
CREATE TABLE IF NOT EXISTS sports_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  gender      TEXT,
  age         INTEGER,
  sports      TEXT[] DEFAULT '{}',
  career_years INTEGER DEFAULT 0,
  is_pro      BOOLEAN DEFAULT FALSE,
  intro       TEXT,
  is_visible  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. contest_profiles (공모전 능력 프로필) ───────────────
CREATE TABLE IF NOT EXISTS contest_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  department    TEXT,
  gender        TEXT,
  age           INTEGER,
  contest_count INTEGER DEFAULT 0,
  certificates  TEXT[] DEFAULT '{}',
  fields        TEXT[] DEFAULT '{}',
  intro         TEXT,
  is_visible    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. sports_reservations (시설 예약 현황 — 크롤링) ───────
CREATE TABLE IF NOT EXISTS sports_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility         TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  status           TEXT DEFAULT 'available' CHECK (status IN ('available','reserved','closed')),
  crawled_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility, reservation_date, start_time)
);

-- ─── 5. matches (스포츠 매치글) ─────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_name       TEXT NOT NULL,
  sport           TEXT CHECK (sport IN ('축구','풋살','농구','테니스','e스포츠')),
  match_size      TEXT,
  location        TEXT,
  match_datetime  TIMESTAMPTZ,
  reservation_id  UUID REFERENCES sports_reservations(id) ON DELETE SET NULL,
  required_level  TEXT CHECK (required_level IN ('초급','중급','고수')),
  description     TEXT,
  status          TEXT DEFAULT '모집중' CHECK (status IN ('모집중','매치확정','취소됨')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. match_applications (매치 신청) ──────────────────────
CREATE TABLE IF NOT EXISTS match_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     UUID REFERENCES matches(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, applicant_id)
);

-- ─── 7. message_rooms (1:1 채팅방) ─────────────────────────
CREATE TABLE IF NOT EXISTS message_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES match_applications(id) ON DELETE CASCADE,
  participant_1  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. messages (1:1 채팅 메시지) ──────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID REFERENCES message_rooms(id) ON DELETE CASCADE,
  sender_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. reviews (매너 평가) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, reviewer_id)
);

-- ─── 10. contest_matches (공모전 팀원 모집) ─────────────────
CREATE TABLE IF NOT EXISTS contest_matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contest_name     TEXT NOT NULL,
  contest_category TEXT,
  region           TEXT,
  deadline         DATE,
  team_size        INTEGER CHECK (team_size >= 1 AND team_size <= 5),
  current_count    INTEGER DEFAULT 0,
  description      TEXT,
  status           TEXT DEFAULT '모집중' CHECK (status IN ('모집중','마감')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. contest_applications (공모전 신청) ─────────────────
CREATE TABLE IF NOT EXISTS contest_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_match_id  UUID REFERENCES contest_matches(id) ON DELETE CASCADE,
  applicant_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  ai_recommendation TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contest_match_id, applicant_id)
);

-- ─── 12. contest_chat_rooms (공모전 그룹 채팅방) ────────────
CREATE TABLE IF NOT EXISTS contest_chat_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_match_id UUID REFERENCES contest_matches(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 13. contest_chat_members (그룹 채팅 멤버) ─────────────
CREATE TABLE IF NOT EXISTS contest_chat_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID REFERENCES contest_chat_rooms(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- ─── 14. contest_chat_messages (그룹 채팅 메시지) ───────────
CREATE TABLE IF NOT EXISTS contest_chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID REFERENCES contest_chat_rooms(id) ON DELETE CASCADE,
  sender_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 15. external_contests (외부 공모전 — 크롤링) ───────────
CREATE TABLE IF NOT EXISTS external_contests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  organizer   TEXT,
  field       TEXT,
  region      TEXT,
  start_date  DATE,
  end_date    DATE,
  deadline    DATE,
  prize       TEXT,
  description TEXT,
  url         TEXT UNIQUE,
  source      TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 16. notifications (알림) ───────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  related_id   TEXT,
  related_type TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 17. reports (신고) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  detail      TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 인덱스 ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_author ON matches(author_id);
CREATE INDEX IF NOT EXISTS idx_matches_sport ON matches(sport);
CREATE INDEX IF NOT EXISTS idx_matches_datetime ON matches(match_datetime);
CREATE INDEX IF NOT EXISTS idx_match_apps_match ON match_applications(match_id);
CREATE INDEX IF NOT EXISTS idx_match_apps_applicant ON match_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_contest_matches_status ON contest_matches(status);
CREATE INDEX IF NOT EXISTS idx_contest_apps_match ON contest_applications(contest_match_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

-- ─── RLS 활성화 ────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ─── RLS 정책 ──────────────────────────────────────────────

-- profiles
CREATE POLICY "인증유저 프로필 조회" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "본인 프로필 수정" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "프로필 생성" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- sports_profiles
CREATE POLICY "공개 스포츠프로필 조회" ON sports_profiles FOR SELECT TO authenticated USING (is_visible = true OR user_id = auth.uid());
CREATE POLICY "본인 스포츠프로필 CUD" ON sports_profiles FOR ALL TO authenticated USING (user_id = auth.uid());

-- contest_profiles
CREATE POLICY "공개 공모전프로필 조회" ON contest_profiles FOR SELECT TO authenticated USING (is_visible = true OR user_id = auth.uid());
CREATE POLICY "본인 공모전프로필 CUD" ON contest_profiles FOR ALL TO authenticated USING (user_id = auth.uid());

-- matches
CREATE POLICY "매치 조회" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "매치 작성" ON matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "본인 매치 수정삭제" ON matches FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "본인 매치 삭제" ON matches FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- match_applications
CREATE POLICY "관련자 신청 조회" ON match_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "신청 생성" ON match_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "관련자 신청 수정" ON match_applications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "본인 신청 삭제" ON match_applications FOR DELETE TO authenticated USING (auth.uid() = applicant_id);

-- message_rooms
CREATE POLICY "참여자 채팅방 조회" ON message_rooms FOR SELECT TO authenticated USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "채팅방 생성" ON message_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "채팅방 삭제" ON message_rooms FOR DELETE TO authenticated USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- messages
CREATE POLICY "참여자 메시지 조회" ON messages FOR SELECT TO authenticated USING (
  room_id IN (SELECT id FROM message_rooms WHERE participant_1 = auth.uid() OR participant_2 = auth.uid())
);
CREATE POLICY "메시지 전송" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- reviews
CREATE POLICY "후기 조회" ON reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "후기 작성" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- contest_matches
CREATE POLICY "공모전모집 조회" ON contest_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "공모전모집 작성" ON contest_matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "본인 공모전모집 수정" ON contest_matches FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "본인 공모전모집 삭제" ON contest_matches FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- contest_applications
CREATE POLICY "공모전신청 조회" ON contest_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "공모전신청 생성" ON contest_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "공모전신청 수정" ON contest_applications FOR UPDATE TO authenticated USING (true);

-- contest_chat_rooms
CREATE POLICY "그룹채팅방 조회" ON contest_chat_rooms FOR SELECT TO authenticated USING (
  id IN (SELECT room_id FROM contest_chat_members WHERE user_id = auth.uid())
);
CREATE POLICY "그룹채팅방 생성" ON contest_chat_rooms FOR INSERT TO authenticated WITH CHECK (true);

-- contest_chat_members
CREATE POLICY "멤버 조회" ON contest_chat_members FOR SELECT TO authenticated USING (
  room_id IN (SELECT room_id FROM contest_chat_members WHERE user_id = auth.uid())
);
CREATE POLICY "멤버 추가" ON contest_chat_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "멤버 삭제" ON contest_chat_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- contest_chat_messages
CREATE POLICY "그룹메시지 조회" ON contest_chat_messages FOR SELECT TO authenticated USING (
  room_id IN (SELECT room_id FROM contest_chat_members WHERE user_id = auth.uid())
);
CREATE POLICY "그룹메시지 전송" ON contest_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- external_contests
CREATE POLICY "공모전 조회" ON external_contests FOR SELECT TO authenticated USING (true);

-- sports_reservations
CREATE POLICY "시설예약 조회" ON sports_reservations FOR SELECT TO authenticated USING (true);

-- notifications
CREATE POLICY "본인 알림 조회" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "알림 생성" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "본인 알림 수정" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- reports
CREATE POLICY "신고 생성" ON reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "관리자 신고 조회" ON reports FOR SELECT TO authenticated USING (
  auth.uid() = reporter_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── Realtime 활성화 ───────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE contest_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE match_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE contest_matches;

-- ─── 18. profiles 자동 생성을 위한 트리거 ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, full_name, student_id, department, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nickname', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'student_id', '0000000000'),
    new.raw_user_meta_data->>'department',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

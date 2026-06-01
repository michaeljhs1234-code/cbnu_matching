import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { contestMatchId, applicantId } = await request.json();
    if (!contestMatchId || !applicantId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 공모전 정보 조회
    const { data: contestMatch } = await supabase
      .from('contest_matches')
      .select('*')
      .eq('id', contestMatchId)
      .single();

    // 지원자 프로필 조회
    const { data: applicant } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', applicantId)
      .single();

    const { data: contestProfile } = await supabase
      .from('contest_profiles')
      .select('*')
      .eq('user_id', applicantId)
      .maybeSingle();

    if (!contestMatch || !applicant) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // AI 없이 기본 추천 메시지 반환
      return NextResponse.json({
        recommendation: `${applicant.nickname}님은 ${applicant.department || '미지정'} 학과 소속이며, 공모전 참여 ${contestProfile?.contest_count || 0}회 경력이 있습니다.`,
      });
    }

    // Claude API 호출
    const prompt = `당신은 대학교 공모전 팀원 매칭 AI입니다.
다음 공모전 모집 정보와 지원자 정보를 분석하여 200자 이내로 추천 사유를 한국어로 작성해주세요.

[공모전 정보]
- 공모전명: ${contestMatch.contest_name}
- 분야: ${contestMatch.contest_category}
- 지역: ${contestMatch.region}
- 현재 모집인원: ${contestMatch.current_count}/${contestMatch.team_size}명

[지원자 정보]
- 닉네임: ${applicant.nickname}
- 학과: ${applicant.department || '미지정'}
- 공모전 참여: ${contestProfile?.contest_count || 0}회
- 보유 자격증: ${contestProfile?.certificates?.join(', ') || '없음'}
- 관심 분야: ${contestProfile?.fields?.join(', ') || '미지정'}
- 자기소개: ${contestProfile?.intro || '없음'}

추천 사유를 작성해주세요:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return NextResponse.json({
        recommendation: `${applicant.nickname}님은 ${applicant.department || '미지정'} 학과 소속입니다.`,
      });
    }

    const aiData = await response.json();
    const recommendation = aiData.content?.[0]?.text || '추천 분석을 완료할 수 없습니다.';

    // DB에 추천 결과 저장
    await supabase
      .from('contest_applications')
      .update({ ai_recommendation: recommendation })
      .eq('contest_match_id', contestMatchId)
      .eq('applicant_id', applicantId);

    return NextResponse.json({ recommendation });
  } catch (err) {
    console.error('AI recommend error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

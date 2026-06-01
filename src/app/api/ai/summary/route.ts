import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { contestId } = await request.json();
    if (!contestId) {
      return NextResponse.json({ error: 'Missing contestId' }, { status: 400 });
    }

    // 외부 공모전 정보 조회
    const { data: contest } = await supabase
      .from('external_contests')
      .select('*')
      .eq('id', contestId)
      .single();

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary: `${contest.title}은 ${contest.organizer}에서 주최하는 공모전입니다. 마감일: ${contest.deadline}`,
      });
    }

    const prompt = `당신은 대학생 공모전 가이드 AI입니다.
다음 공모전 정보를 분석하여 대학생이 이해하기 쉽게 300자 이내로 요약해주세요.
참가 팁도 간단히 포함해주세요.

[공모전 정보]
- 공모전명: ${contest.title}
- 주최: ${contest.organizer}
- 분야: ${contest.field}
- 지역: ${contest.region}
- 마감: ${contest.deadline}
- 상금: ${contest.prize || '미정'}
- 설명: ${contest.description || '없음'}

요약:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        summary: `${contest.title}은 ${contest.organizer}에서 주최하는 공모전입니다.`,
      });
    }

    const aiData = await response.json();
    const summary = aiData.content?.[0]?.text || '요약을 생성할 수 없습니다.';

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('AI summary error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

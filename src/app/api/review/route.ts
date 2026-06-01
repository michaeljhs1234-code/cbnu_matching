import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { matchId, revieweeId, rating, comment } = await request.json();

    if (!matchId || !revieweeId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '필수 정보가 누락되었거나 잘못되었습니다.' }, { status: 400 });
    }

    // 본인 평가 방지
    if (user.id === revieweeId) {
      return NextResponse.json({ error: '본인을 평가할 수 없습니다.' }, { status: 400 });
    }

    // 매치 확정 상태 확인
    const { data: match } = await supabase
      .from('matches')
      .select('status')
      .eq('id', matchId)
      .single();

    if (!match || match.status !== '매치확정') {
      return NextResponse.json({ error: '확정된 매치만 평가할 수 있습니다.' }, { status: 400 });
    }

    // 중복 평가 방지
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('match_id', matchId)
      .eq('reviewer_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 평가를 완료했습니다.' }, { status: 409 });
    }

    const { error } = await supabase.from('reviews').insert({
      match_id: matchId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Review error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportedId, reason, detail } = await request.json();

    if (!reportedId || !reason) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 본인 신고 방지
    if (user.id === reportedId) {
      return NextResponse.json({ error: '본인을 신고할 수 없습니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id: reportedId,
      reason,
      detail: detail || null,
      status: 'pending',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 피신고자의 누적 신고 3건 이상 시 경고 알림
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_id', reportedId)
      .eq('status', 'pending');

    if (count && count >= 3) {
      await supabase.from('notifications').insert({
        user_id: reportedId,
        type: 'report_warning',
        message: '신고가 누적되어 경고를 받았습니다. 건전한 활동을 부탁드립니다.',
        related_type: 'report',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Report error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
